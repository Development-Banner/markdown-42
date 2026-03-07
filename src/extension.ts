import * as vscode from 'vscode';
import { Markdown42Editor } from './editor/MarkscapeEditor';
import { OutlineProvider } from './outline/OutlineProvider';
import { DocumentModel } from './editor/DocumentModel';

let outlineProvider: OutlineProvider | undefined;

let _activeModel: DocumentModel | null = null;
export function setActiveModel(m: DocumentModel | null): void {
  _activeModel = m;
}

export function activate(context: vscode.ExtensionContext): void {
  outlineProvider = new OutlineProvider();

  // Register the custom text editor provider
  const editorProvider = vscode.window.registerCustomEditorProvider(
    Markdown42Editor.viewType,
    new Markdown42Editor(context, outlineProvider),
    {
      webviewOptions: {
        // Retain webview state when hidden (prevents full re-render on tab switch)
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: false,
    }
  );

  // Register the Document Outline tree view
  const treeView = vscode.window.createTreeView('markdown42Outline', {
    treeDataProvider: outlineProvider,
    showCollapseAll: false,
  });

  // Commands
  const toggleSourceCmd = vscode.commands.registerCommand(
    'markdown42.toggleSource',
    () => {
      vscode.commands.executeCommand('markdown42.toggleSource.internal');
    }
  );

  const openInMarkdown42Cmd = vscode.commands.registerCommand(
    'markdown42.openInMarkdown42',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.languageId === 'markdown') {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          editor.document.uri,
          Markdown42Editor.viewType
        );
      }
    }
  );

  const refreshOutlineCmd = vscode.commands.registerCommand(
    'markdown42.refreshOutline',
    () => {
      outlineProvider?.clear();
    }
  );

  const scrollToLineCmd = vscode.commands.registerCommand(
    'markdown42.scrollToLine',
    (_line: number) => {
      // Handled by the webview — this command is invoked from outline click
    }
  );

  const saveCmd = vscode.commands.registerCommand('markdown42.save', () => {
    _activeModel?.save();
  });

  context.subscriptions.push(
    editorProvider,
    treeView,
    toggleSourceCmd,
    openInMarkdown42Cmd,
    refreshOutlineCmd,
    scrollToLineCmd,
    saveCmd,
    outlineProvider
  );
}

export function deactivate(): void {
  outlineProvider?.dispose();
}
