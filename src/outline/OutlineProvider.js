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
exports.OutlineProvider = exports.HeadingTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class HeadingTreeItem extends vscode.TreeItem {
    constructor(heading, navCommand) {
        super(heading.text, vscode.TreeItemCollapsibleState.None);
        this.heading = heading;
        this.tooltip = `Line ${heading.line + 1}`;
        this.description = `H${heading.level}`;
        this.iconPath = new vscode.ThemeIcon(heading.level <= 2 ? 'symbol-class' : 'symbol-field');
        if (navCommand) {
            this.command = navCommand;
        }
    }
}
exports.HeadingTreeItem = HeadingTreeItem;
/**
 * Provides the Document Outline tree view populated from webview heading data.
 * Refreshed whenever the webview sends an 'outline' message.
 */
class OutlineProvider {
    constructor() {
        this._headings = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    /** Called by the editor when webview sends a fresh outline */
    refresh(headings) {
        this._headings = headings;
        this._onDidChangeTreeData.fire(undefined);
    }
    clear() {
        this._headings = [];
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(_element) {
        return this._headings.map(h => new HeadingTreeItem(h, {
            command: 'markscape.scrollToLine',
            title: 'Scroll to heading',
            arguments: [h.line],
        }));
    }
    dispose() {
        this._onDidChangeTreeData.dispose();
    }
}
exports.OutlineProvider = OutlineProvider;
//# sourceMappingURL=OutlineProvider.js.map