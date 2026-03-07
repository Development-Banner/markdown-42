"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const MarkscapeEditor_1 = require("./editor/MarkscapeEditor");
const OutlineProvider_1 = require("./outline/OutlineProvider");
let outlineProvider;
function activate(context) {
    outlineProvider = new OutlineProvider_1.OutlineProvider();
    // Register the custom text editor provider
    const editorProvider = vscode.window.registerCustomEditorProvider(MarkscapeEditor_1.MarkscapeEditor.viewType, new MarkscapeEditor_1.MarkscapeEditor(context, outlineProvider), {
        webviewOptions: {
            // Retain webview state when hidden (prevents full re-render on tab switch)
            retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
    });
    // Register the Document Outline tree view
    const treeView = vscode.window.createTreeView('markscapeOutline', {
        treeDataProvider: outlineProvider,
        showCollapseAll: false,
    });
    // Commands
    const toggleSourceCmd = vscode.commands.registerCommand('markscape.toggleSource', () => {
        // This command is handled inside the webview via keyboard shortcut.
        // The keybinding sends the command to the active editor's webview.
        // The webview listens for it via the VS Code extension messaging.
        vscode.commands.executeCommand('markscape.toggleSource.internal');
    });
    const openInMarkscapeCmd = vscode.commands.registerCommand('markscape.openInMarkscape', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor?.document.languageId === 'markdown') {
            await vscode.commands.executeCommand('vscode.openWith', editor.document.uri, MarkscapeEditor_1.MarkscapeEditor.viewType);
        }
    });
    const refreshOutlineCmd = vscode.commands.registerCommand('markscape.refreshOutline', () => {
        outlineProvider?.clear();
    });
    const scrollToLineCmd = vscode.commands.registerCommand('markscape.scrollToLine', (_line) => {
        // Handled by the webview — this command is invoked from outline click
    });
    context.subscriptions.push(editorProvider, treeView, toggleSourceCmd, openInMarkscapeCmd, refreshOutlineCmd, scrollToLineCmd, outlineProvider);
}
function deactivate() {
    outlineProvider?.dispose();
}
//# sourceMappingURL=extension.js.map