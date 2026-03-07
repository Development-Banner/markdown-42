import * as vscode from 'vscode';
import type { HeadingNode } from '../editor/MessageBus';

export class HeadingTreeItem extends vscode.TreeItem {
  constructor(
    public readonly heading: HeadingNode,
    navCommand?: vscode.Command
  ) {
    super(heading.text, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `Line ${heading.line + 1}`;
    this.description = `H${heading.level}`;
    this.iconPath = new vscode.ThemeIcon(
      heading.level <= 2 ? 'symbol-class' : 'symbol-field'
    );
    if (navCommand) {
      this.command = navCommand;
    }
  }
}

/**
 * Provides the Document Outline tree view populated from webview heading data.
 * Refreshed whenever the webview sends an 'outline' message.
 */
export class OutlineProvider
  implements vscode.TreeDataProvider<HeadingTreeItem>
{
  private _headings: HeadingNode[] = [];
  private _onDidChangeTreeData = new vscode.EventEmitter<
    HeadingTreeItem | undefined
  >();

  readonly onDidChangeTreeData: vscode.Event<HeadingTreeItem | undefined> =
    this._onDidChangeTreeData.event;

  /** Called by the editor when webview sends a fresh outline */
  refresh(headings: HeadingNode[]): void {
    this._headings = headings;
    this._onDidChangeTreeData.fire(undefined);
  }

  clear(): void {
    this._headings = [];
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: HeadingTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: HeadingTreeItem): HeadingTreeItem[] {
    return this._headings.map(
      h =>
        new HeadingTreeItem(h, {
          command: 'markscape.scrollToLine',
          title: 'Scroll to heading',
          arguments: [h.line],
        })
    );
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
