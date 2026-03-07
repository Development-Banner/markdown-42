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
exports.MarkscapeEditor = void 0;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const DocumentModel_1 = require("./DocumentModel");
const config_1 = require("../settings/config");
class MarkscapeEditor {
    constructor(context, outlineProvider) {
        this.context = context;
        this.outlineProvider = outlineProvider;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        const config = (0, config_1.getConfig)();
        const model = new DocumentModel_1.DocumentModel(document);
        // Security: restrict script/resource origins to this extension only
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        };
        webviewPanel.webview.html = this.buildHtml(webviewPanel.webview, (0, config_1.toWebviewConfig)({ ...config }));
        // Type-safe message sender
        const send = (msg) => {
            webviewPanel.webview.postMessage(msg);
        };
        // Handle messages from the webview
        const messageDisposable = webviewPanel.webview.onDidReceiveMessage((raw) => {
            // Runtime validation: ensure the message has a 'type' field
            if (!isWebviewMessage(raw))
                return;
            const msg = raw;
            switch (msg.type) {
                case 'ready':
                    send({
                        type: 'update',
                        content: model.content,
                        version: model.version,
                        config: (0, config_1.toWebviewConfig)(config),
                    });
                    break;
                case 'edit':
                    // Version guard: only apply if version matches our expectation
                    if (msg.version === model.version) {
                        model.applyEdit(msg.content);
                    }
                    break;
                case 'outline':
                    this.outlineProvider.refresh(msg.headings);
                    break;
                case 'openLink': {
                    // Security: validate href before opening externally
                    const href = sanitizeHref(msg.href);
                    if (href) {
                        vscode.env.openExternal(vscode.Uri.parse(href));
                    }
                    break;
                }
                case 'error':
                    // Log webview errors to the extension output, not the user's console
                    console.error('[Markscape webview error]', msg.message);
                    break;
            }
        });
        // Propagate external edits (git checkout, other extensions, etc.)
        const docChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() !== document.uri.toString())
                return;
            model.notifyExternalChange(e.document);
            send({
                type: 'update',
                content: model.content,
                version: model.version,
                config: (0, config_1.toWebviewConfig)(config),
            });
        });
        // Propagate settings changes to webview
        const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('markscape')) {
                const updated = (0, config_1.getConfig)();
                send({ type: 'configChange', config: (0, config_1.toWebviewConfig)(updated) });
            }
        });
        // Set context key so keybinding 'when' clause works
        vscode.commands.executeCommand('setContext', 'markscapeEditorActive', true);
        vscode.commands.executeCommand('setContext', 'markscapeActive', true);
        webviewPanel.onDidDispose(() => {
            messageDisposable.dispose();
            docChangeDisposable.dispose();
            configChangeDisposable.dispose();
            model.dispose();
            this.outlineProvider.clear();
            vscode.commands.executeCommand('setContext', 'markscapeEditorActive', false);
            vscode.commands.executeCommand('setContext', 'markscapeActive', false);
        });
    }
    /**
     * Builds the webview HTML with a nonce-based CSP.
     * No inline scripts or styles — everything comes from extension URIs.
     *
     * Security:
     * - nonce is cryptographically random per webview instance
     * - default-src 'none' whitelists only what we explicitly need
     * - img-src allows https: and data: for markdown images
     * - font-src allows the webview csp source only
     */
    buildHtml(webview, _config) {
        // Cross-platform URI construction using vscode.Uri.joinPath
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.js'));
        // Cryptographically random nonce — different every time the webview opens
        const nonce = crypto.randomBytes(16).toString('hex');
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'nonce-${nonce}';
             script-src 'nonce-${nonce}';
             img-src ${webview.cspSource} https: data:;
             font-src ${webview.cspSource};
             connect-src 'none';">
  <link rel="stylesheet" href="${cssUri}">
  <title>Markscape</title>
</head>
<body>
  <div id="content-wrapper" role="main">
    <div id="blocks" aria-label="Document content"></div>
    <div id="source-editor" hidden aria-label="Source editor">
      <textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"></textarea>
    </div>
  </div>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }
}
exports.MarkscapeEditor = MarkscapeEditor;
MarkscapeEditor.viewType = 'markscape.editor';
/** Validates that a value looks like a webview message (has a string 'type'). */
function isWebviewMessage(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        typeof value['type'] === 'string');
}
/** Allowlist-based href sanitizer: only http/https/mailto are permitted. */
function sanitizeHref(href) {
    try {
        const url = new URL(href);
        if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
            return href;
        }
        return null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=MarkscapeEditor.js.map