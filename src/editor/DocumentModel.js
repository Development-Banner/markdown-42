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
exports.DocumentModel = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Single source of truth for document content.
 *
 * Never directly mutates the buffer — all edits go through WorkspaceEdit
 * so undo/redo works correctly and the webview always stays in sync.
 */
class DocumentModel {
    constructor(_document) {
        this._document = _document;
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this._version = _document.version;
    }
    get content() {
        return this._document.getText();
    }
    get version() {
        return this._version;
    }
    get uri() {
        return this._document.uri;
    }
    /**
     * Applies a full-document replacement via WorkspaceEdit.
     * This keeps VS Code's undo stack intact.
     */
    async applyEdit(newContent) {
        // Guard: don't apply identical content (avoids redundant dirty state)
        if (newContent === this._document.getText()) {
            return;
        }
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(this._document.positionAt(0), this._document.positionAt(this._document.getText().length));
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
    notifyExternalChange(document) {
        this._document = document;
        this._version++;
        this._onDidChange.fire(this._document.getText());
    }
    dispose() {
        this._onDidChange.dispose();
    }
}
exports.DocumentModel = DocumentModel;
//# sourceMappingURL=DocumentModel.js.map