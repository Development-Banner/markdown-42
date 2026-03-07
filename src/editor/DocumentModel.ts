import * as vscode from 'vscode';

/**
 * Single source of truth for document content.
 *
 * Never directly mutates the buffer — all edits go through WorkspaceEdit
 * so undo/redo works correctly and the webview always stays in sync.
 */
export class DocumentModel {
  private _version: number;
  private readonly _onDidChange = new vscode.EventEmitter<string>();

  readonly onDidChange: vscode.Event<string> = this._onDidChange.event;

  constructor(private _document: vscode.TextDocument) {
    this._version = _document.version;
  }

  get content(): string {
    return this._document.getText();
  }

  get version(): number {
    return this._version;
  }

  get uri(): vscode.Uri {
    return this._document.uri;
  }

  /**
   * Applies a full-document replacement via WorkspaceEdit.
   * This keeps VS Code's undo stack intact.
   */
  async applyEdit(newContent: string): Promise<void> {
    // Guard: don't apply identical content (avoids redundant dirty state)
    if (newContent === this._document.getText()) {
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      this._document.positionAt(0),
      this._document.positionAt(this._document.getText().length)
    );
    edit.replace(this._document.uri, fullRange, newContent);

    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
      this._version++;
      this._onDidChange.fire(newContent);
    }
  }

  /**
   * Called when VS Code notifies us of an external change (git, other extension, etc.)
   * Updates the internal version counter so the webview can discard stale messages.
   */
  notifyExternalChange(document: vscode.TextDocument): void {
    this._document = document;
    this._version++;
    this._onDidChange.fire(this._document.getText());
  }

  async save(): Promise<void> {
    await this._document.save();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
