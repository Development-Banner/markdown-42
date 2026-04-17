import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { DocumentModel } from './DocumentModel';
import { OutlineProvider } from '../outline/OutlineProvider';
import { getConfig, toWebviewConfig } from '../settings/config';
import type { HostToWebview, WebviewToHost } from './MessageBus';
import { computeBlockDiff } from './diffEngine';
import { setActiveModel } from '../extension';

/** Entry in the per-filename panel registry used for diff scroll sync and highlighting. */
interface PanelEntry {
  readonly id: symbol;
  send: (msg: HostToWebview) => void;
  blocks: string[] | undefined;
  /** true when the document comes from a non-file scheme (e.g. git://) — the "original" side */
  readonly isOriginal: boolean;
}

export class Markdown42Editor implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'markdown42.editor';

  /**
   * Cross-instance registry: fileName → set of open panels for that file.
   * Populated in resolveCustomTextEditor, cleaned up in onDidDispose.
   * Enables diff view scroll sync and block-level diff highlighting.
   */
  private static readonly _panelRegistry = new Map<string, Set<PanelEntry>>();

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

    // Original-side panels (e.g. git://) are read-only — no editing allowed
    const isReadOnly = document.uri.scheme !== 'file';

    // Suppress echo: when the webview triggers an edit we must not re-send
    // the resulting onDidChangeTextDocument back as an 'update'. Without
    // this guard the round-trip causes a redundant renderUpdate in the
    // webview, producing a visible flicker on block transitions.
    let isApplyingWebviewEdit = false;

    // Security: restrict script/resource origins to this extension only
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewPanel.webview.html = this.buildHtml(
      webviewPanel.webview,
      toWebviewConfig({ ...config }, isReadOnly)
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
              config: toWebviewConfig(config, isReadOnly),
            });
            break;

          case 'edit':
            // Defense-in-depth: read-only panels must never apply edits
            if (isReadOnly) break;
            // Version guard: only apply if version matches our expectation
            if (msg.version === model.version) {
              isApplyingWebviewEdit = true;
              await model.applyEdit(msg.content);
              isApplyingWebviewEdit = false;
              if (config.autoSave) {
                await model.save();
              }
            }
            break;

          case 'save':
            if (isReadOnly) break;
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

          case 'scrollSync':
            // Relay scroll position to sibling panels (e.g. opposite side of diff)
            relayToSiblings({ type: 'scrollSync', scrollTop: msg.scrollTop });
            break;

          case 'blockList':
            // Store block list and recompute diff highlights when both sides are ready
            panelEntry.blocks = msg.blocks;
            broadcastDiff();
            break;

          case 'modeChange':
            // Relay mode switch to sibling panels so both sides of a diff stay in sync
            relayToSiblings({ type: 'setMode', mode: msg.mode });
            break;
        }
      }
    );

    // Propagate external edits (git checkout, other extensions, etc.)
    // Skip changes that originated from the webview itself — echoing
    // those back causes a redundant renderUpdate and visible flicker.
    const docChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (isApplyingWebviewEdit) return;
      model.notifyExternalChange(e.document);
      send({
        type: 'update',
        content: model.content,
        version: model.version,
        config: toWebviewConfig(config, isReadOnly),
      });
    });

    // Propagate settings changes to webview and refresh local config (for autoSave)
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
      e => {
        if (e.affectsConfiguration('markdown42')) {
          config = getConfig();
          send({ type: 'configChange', config: toWebviewConfig(config, isReadOnly) });
        }
      }
    );

    // Set context key so keybinding 'when' clause works
    vscode.commands.executeCommand('setContext', 'markdown42EditorActive', true);
    vscode.commands.executeCommand('setContext', 'markdown42Active', true);

    // ── Diff view: panel registry ─────────────────────────────────────────
    // Register this panel so paired panels (e.g. git diff) can sync scrolling
    // and exchange block lists for diff highlighting.
    const panelKey = document.fileName;
    const panelEntry: PanelEntry = {
      id: Symbol(),
      send,
      blocks: undefined,
      isOriginal: document.uri.scheme !== 'file',
    };

    if (!Markdown42Editor._panelRegistry.has(panelKey)) {
      Markdown42Editor._panelRegistry.set(panelKey, new Set());
    }
    Markdown42Editor._panelRegistry.get(panelKey)!.add(panelEntry);

    /** Broadcast a message to every other panel registered under the same key. */
    const relayToSiblings = (msg: HostToWebview): void => {
      const peers = Markdown42Editor._panelRegistry.get(panelKey);
      if (!peers) return;
      for (const peer of peers) {
        if (peer.id !== panelEntry.id) {
          peer.send(msg);
        }
      }
    };

    /** Compute a simple index-aligned block diff and push highlightDiff to both panels. */
    const broadcastDiff = (): void => {
      const peers = Markdown42Editor._panelRegistry.get(panelKey);
      if (!peers || peers.size < 2) return;

      // Find original (git://) and modified (file://) entries
      let original: PanelEntry | undefined;
      let modified: PanelEntry | undefined;
      for (const p of peers) {
        if (p.blocks === undefined) return; // not both rendered yet
        if (p.isOriginal) { original = p; }
        else { modified = p; }
      }
      if (!original?.blocks || !modified?.blocks) return;

      const diff = computeBlockDiff(original.blocks, modified.blocks);

      original.send({
        type: 'highlightDiff',
        changed: diff.original.changed,
        added: diff.original.added,
        removed: diff.original.removed,
        gaps: diff.original.gaps,
      });
      modified.send({
        type: 'highlightDiff',
        changed: diff.modified.changed,
        added: diff.modified.added,
        removed: diff.modified.removed,
        gaps: diff.modified.gaps,
      });
    };

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

      // Remove from panel registry and clear diff highlights from siblings
      const peers = Markdown42Editor._panelRegistry.get(panelKey);
      if (peers) {
        peers.delete(panelEntry);
        if (peers.size === 0) {
          Markdown42Editor._panelRegistry.delete(panelKey);
        } else {
          // Clear diff highlights on remaining sibling panels
          for (const peer of peers) {
            peer.send({ type: 'highlightDiff', changed: [], added: [], removed: [], gaps: [] });
            peer.blocks = undefined;
          }
        }
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
    config: ReturnType<typeof toWebviewConfig>
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
<body${config.readOnly ? ' class="read-only"' : ''}>
  <div id="tab-bar" role="tablist" aria-label="Editor mode">
    <div class="mode-toggle">
      <button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">
        <svg class="tab-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/></svg>
        Preview
      </button>
      <button role="tab" aria-selected="false" data-mode="source" id="tab-source">
        <svg class="tab-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 4 1 8 5 12"/><polyline points="11 4 15 8 11 12"/></svg>
        Source
      </button>
    </div>
    <button id="sync-btn" type="button" data-state="saved" aria-label="Document sync status" title="Saved (Ctrl+S)">
      <svg class="icon-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 9 6 13 14 4"/></svg>
      <svg class="icon-spin" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 2a6 6 0 1 1-6 6"/></svg>
      <span class="sync-text">Saved</span>
    </button>
  </div>
  <div id="content-wrapper" role="main">
    <div id="blocks" aria-label="Document content"></div>
    <div id="source-editor" aria-label="Source editor" hidden>
      <textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"${config.readOnly ? ' readonly' : ''}></textarea>
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
