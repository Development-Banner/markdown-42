import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { DocumentModel } from './DocumentModel';
import { OutlineProvider } from '../outline/OutlineProvider';
import { getConfig, toWebviewConfig } from '../settings/config';
import type { HostToWebview, WebviewToHost } from './MessageBus';
import { setActiveModel } from '../extension';

export class Markdown42Editor implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'markdown42.editor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly outlineProvider: OutlineProvider
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    let config = getConfig();
    const model = new DocumentModel(document);

    // Security: restrict script/resource origins to this extension only
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewPanel.webview.html = this.buildHtml(
      webviewPanel.webview,
      toWebviewConfig({ ...config })
    );

    // Type-safe message sender
    const send = (msg: HostToWebview): void => {
      webviewPanel.webview.postMessage(msg);
    };

    // Handle messages from the webview
    const messageDisposable = webviewPanel.webview.onDidReceiveMessage(
      async (raw: unknown) => {
        // Runtime validation: ensure the message has a 'type' field
        if (!isWebviewMessage(raw)) return;
        const msg = raw as WebviewToHost;

        switch (msg.type) {
          case 'ready':
            send({
              type: 'update',
              content: model.content,
              version: model.version,
              config: toWebviewConfig(config),
            });
            break;

          case 'edit':
            // Version guard: only apply if version matches our expectation
            if (msg.version === model.version) {
              await model.applyEdit(msg.content);
              if (config.autoSave) {
                await model.save();
              }
            }
            break;

          case 'save':
            await model.save();
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
            console.error('[Markdown42 webview error]', msg.message);
            break;
        }
      }
    );

    // Propagate external edits (git checkout, other extensions, etc.)
    const docChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      model.notifyExternalChange(e.document);
      send({
        type: 'update',
        content: model.content,
        version: model.version,
        config: toWebviewConfig(config),
      });
    });

    // Propagate settings changes to webview and refresh local config (for autoSave)
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
      e => {
        if (e.affectsConfiguration('markdown42')) {
          config = getConfig();
          send({ type: 'configChange', config: toWebviewConfig(config) });
        }
      }
    );

    // Set context key so keybinding 'when' clause works
    vscode.commands.executeCommand('setContext', 'markdown42EditorActive', true);
    vscode.commands.executeCommand('setContext', 'markdown42Active', true);

    // Track which model is active so the single save command knows what to save
    let isActive = webviewPanel.active;
    if (isActive) {
      setActiveModel(model);
    }
    const viewStateDisposable = webviewPanel.onDidChangeViewState(e => {
      isActive = e.webviewPanel.active;
      setActiveModel(isActive ? model : null);
    });

    webviewPanel.onDidDispose(() => {
      if (isActive) {
        setActiveModel(null);
      }
      viewStateDisposable.dispose();
      messageDisposable.dispose();
      docChangeDisposable.dispose();
      configChangeDisposable.dispose();
      model.dispose();
      this.outlineProvider.clear();
      vscode.commands.executeCommand(
        'setContext',
        'markdown42EditorActive',
        false
      );
      vscode.commands.executeCommand('setContext', 'markdown42Active', false);
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
  private buildHtml(
    webview: vscode.Webview,
    _config: ReturnType<typeof toWebviewConfig>
  ): string {
    // Cross-platform URI construction using vscode.Uri.joinPath
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css')
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.js')
    );

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
  <title>Markdown42</title>
</head>
<body>
  <div id="tab-bar" role="tablist" aria-label="Editor mode">
    <button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">Preview</button>
    <button role="tab" aria-selected="false" data-mode="source" id="tab-source">Source</button>
  </div>
  <div id="content-wrapper" role="main">
    <div id="blocks" aria-label="Document content"></div>
    <div id="source-editor" aria-label="Source editor">
      <textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"></textarea>
    </div>
  </div>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

/** Validates that a value looks like a webview message (has a string 'type'). */
function isWebviewMessage(value: unknown): value is { type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Record<string, unknown>)['type'] === 'string'
  );
}

/** Allowlist-based href sanitizer: only http/https/mailto are permitted. */
function sanitizeHref(href: string): string | null {
  try {
    const url = new URL(href);
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return href;
    }
    return null;
  } catch {
    return null;
  }
}
