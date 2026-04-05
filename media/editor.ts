// Webview brain — compiled by esbuild to media/editor.js
// Runs in the VS Code webview sandbox (browser context, no Node.js APIs).

import { renderAll, renderUpdate, extractHeadings, getRenderedBlocks, serializeCurrentBlocks } from './renderer';
import { enterEditMode, isEditing, getActiveBlockIndex, commitActiveEdit } from './inlineEditor';
import type { HostToWebview, WebviewToHost, WebviewConfig } from '../src/editor/MessageBus';
import { applyModeVisibility, getSourceModeContent, updateEmptyState } from './modeHelpers';

// VS Code webview API — injected by the extension host
declare function acquireVsCodeApi(): {
  postMessage: (msg: WebviewToHost) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();
const blocksContainer = document.getElementById('blocks') as HTMLElement;
const sourceEditor = document.getElementById('source-editor') as HTMLElement;
const sourceTextarea = document.getElementById('source-textarea') as HTMLTextAreaElement;

let localVersion = 0;
let currentConfig: WebviewConfig = {
  fontSize: 16,
  lineWidth: 860,
  renderDelay: 150,
  syncScrollOutline: true,
  mode: 'preview',
};
let currentMode: 'preview' | 'source' = 'preview';
let modeInitialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Sync indicator ─────────────────────────────────

const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
const syncText = syncBtn.querySelector('.sync-text') as HTMLSpanElement;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function markSyncing(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncBtn.dataset['state'] = 'syncing';
  syncBtn.title = 'Syncing… (Ctrl+S)';
  syncText.textContent = 'Syncing\u2026';
  syncTimer = setTimeout(markSaved, 700);
}

function markSaved(): void {
  syncTimer = null;
  syncBtn.dataset['state'] = 'saved';
  syncBtn.title = 'Saved (Ctrl+S)';
  syncText.textContent = 'Saved';
}

function triggerSave(): void {
  vscode.postMessage({ type: 'save' });
  markSyncing();
}

function postEdit(content: string): void {
  vscode.postMessage({ type: 'edit', content, version: localVersion });
  markSyncing();
}

syncBtn.addEventListener('click', triggerSave);

// ─── Message handling ──────────────────────────────────

window.addEventListener('message', ({ data }: MessageEvent<HostToWebview>) => {
  switch (data.type) {
    case 'update': {
      // Version guard: discard stale updates (e.g. from undo/redo race)
      if (data.version < localVersion) return;
      localVersion = data.version;
      applyConfig(data.config);

      if (currentMode === 'preview') {
        if (localVersion === data.version && blocksContainer.children.length > 0) {
          renderUpdate(data.content, blocksContainer, handleBlockClick);
        } else {
          renderAll(data.content, blocksContainer, handleBlockClick);
        }
        updateEmptyState(data.content, blocksContainer);
        sendOutline();
      } else {
        sourceTextarea.value = data.content;
      }
      break;
    }

    case 'scrollTo': {
      const target = document.getElementById(`heading-${data.line}-0`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }

    case 'setMode': {
      switchMode(data.mode);
      break;
    }

    case 'configChange': {
      applyConfig(data.config);
      break;
    }
  }
});

// ─── Block click → inline edit ─────────────────────────

/**
 * Enter edit mode for blockIndex, building fresh callbacks each time.
 * Called both directly (no prior active edit) and from the deferred rAF
 * path (after a commit's DOM update has settled).
 */
function _activateEditMode(blockIndex: number): void {
  const blockEl = blocksContainer.querySelector<HTMLElement>(
    `[data-block-index="${blockIndex}"]`
  );
  if (!blockEl) return;

  const rendered = getRenderedBlocks()[blockIndex];
  if (!rendered) return;

  enterEditMode(blockEl, rendered.raw, blockIndex, {
    onCommit: (idx, newRaw) => {
      // Build updated markdown WITHOUT mutating _renderedBlocks first.
      // renderUpdate must see the old raw at [idx] to detect the change and
      // re-render that block. It will update _renderedBlocks synchronously.
      const blocks = getRenderedBlocks();
      const newMarkdown = blocks
        .map((b, i) => (i === idx ? newRaw : b.raw))
        .join('\n\n');
      renderUpdate(newMarkdown, blocksContainer, handleBlockClick);
      sendOutline();
      // scheduleSend reads _renderedBlocks after renderUpdate has updated it
      scheduleSend();
    },
    onCancel: (_idx) => {
      // Re-render the block to restore original content
      renderUpdate(
        getRenderedBlocks().map(b => b.raw).join('\n\n'),
        blocksContainer,
        handleBlockClick
      );
    },
  }, currentConfig.renderDelay);
}

function handleBlockClick(blockIndex: number): void {
  // Clicking the block already in edit mode → no-op.
  if (isEditing() && getActiveBlockIndex() === blockIndex) return;

  // If a different block is being edited, commit it first (clears
  // _activeBlockIndex and queues a re-render rAF).
  if (isEditing()) {
    commitActiveEdit();
  }

  // ALWAYS defer edit-mode entry by one animation frame.
  //
  // rAF callbacks execute in registration order within the same frame.
  // Any renderUpdate rAF already queued (from the commit above, or from
  // an incoming document-change message) fires BEFORE this one, so the
  // DOM is fully settled — correct block count, correct positions — before
  // we query the target element and start hiding its children.
  //
  // Without this deferral a race exists: entering edit mode synchronously
  // while a re-render rAF is pending lets that rAF replace or duplicate the
  // target block (whose index may have shifted due to a block-count change),
  // leaving both the rendered HTML and the textarea visible simultaneously.
  requestAnimationFrame(() => {
    _activateEditMode(blockIndex);
  });
}

function scheduleSend(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const content = serializeCurrentBlocks();
    postEdit(content);
  }, currentConfig.renderDelay);
}

// ─── Outline ───────────────────────────────────────────

function sendOutline(): void {
  const headings = extractHeadings(blocksContainer);
  vscode.postMessage({ type: 'outline', headings });
}

// ─── Scroll sync (outline highlight) ──────────────────

let scrollTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener('scroll', () => {
  if (!currentConfig.syncScrollOutline) return;
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    // Find the topmost visible heading
    const headingEls = blocksContainer.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, h5, h6'
    );
    for (const h of headingEls) {
      const rect = h.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
        // The outline panel is updated by re-sending the outline
        sendOutline();
        break;
      }
    }
  }, 100);
}, { passive: true });

// ─── Link interception ─────────────────────────────────

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const link = target.closest('a');
  if (!link) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  // Prefer data-href (set by markdownParser link renderer) over href
  const href = link.dataset['href'] ?? link.getAttribute('href');
  if (href && href !== '#') {
    vscode.postMessage({ type: 'openLink', href });
  }
}, true);

// ─── Keyboard shortcuts ────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    switchMode(currentMode === 'preview' ? 'source' : 'preview');
  } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    triggerSave();
  }
});

function switchMode(mode: 'preview' | 'source', scroll = true): void {
  if (scroll) window.scrollTo(0, 0);
  updateTabBar(mode);
  currentMode = mode;
  if (mode === 'source') {
    const content = getSourceModeContent(
      isEditing(),
      commitActiveEdit,
      serializeCurrentBlocks
    );
    sourceTextarea.value = content;
    applyModeVisibility('source', blocksContainer, sourceEditor, sourceTextarea);
    sourceTextarea.focus();
  } else {
    const previousContent = serializeCurrentBlocks();
    applyModeVisibility('preview', blocksContainer, sourceEditor, sourceTextarea);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Re-render from source textarea even when it is empty so preview cannot
    // get stuck showing stale content after the source buffer is cleared.
    const content = sourceTextarea.value;
    renderAll(content, blocksContainer, handleBlockClick);
    updateEmptyState(content, blocksContainer);
    sendOutline();
    if (content !== previousContent) {
      postEdit(content);
    }
  }
}

function initTabBar(): void {
  const previewTab = document.getElementById('tab-preview') as HTMLButtonElement | null;
  const sourceTab = document.getElementById('tab-source') as HTMLButtonElement | null;
  if (!previewTab || !sourceTab) return;

  previewTab.addEventListener('click', () => switchMode('preview'));
  sourceTab.addEventListener('click', () => switchMode('source'));
}

function updateTabBar(mode: 'preview' | 'source'): void {
  const previewTab = document.getElementById('tab-preview');
  const sourceTab = document.getElementById('tab-source');
  if (!previewTab || !sourceTab) return;

  previewTab.setAttribute('aria-selected', mode === 'preview' ? 'true' : 'false');
  sourceTab.setAttribute('aria-selected', mode === 'source' ? 'true' : 'false');
}

// Source textarea changes → debounced send
sourceTextarea.addEventListener('input', () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    postEdit(sourceTextarea.value);
  }, currentConfig.renderDelay);
});

// ─── Config application ────────────────────────────────

function applyConfig(config: WebviewConfig): void {
  currentConfig = config;
  const root = document.documentElement;
  root.style.setProperty('--content-width', `${config.lineWidth}px`);
  root.style.setProperty('--base-font-size', `${config.fontSize}px`);

  // Apply the configured mode only on the initial load (the first update after
  // the webview sends 'ready'). After that the user's mode choice is authoritative
  // — re-applying config.mode on every subsequent update would reset the mode
  // every time the host echoes back an edit the user made in Source mode.
  if (!modeInitialized) {
    modeInitialized = true;
    if (config.mode !== currentMode) {
      switchMode(config.mode, false);
    }
  }
}

// ─── Error boundary ────────────────────────────────────

window.addEventListener('error', (e) => {
  vscode.postMessage({
    type: 'error',
    message: `${e.message} (${e.filename}:${e.lineno})`,
  });
});

window.addEventListener('unhandledrejection', (e) => {
  vscode.postMessage({
    type: 'error',
    message: `Unhandled promise rejection: ${String(e.reason)}`,
  });
});

// ─── Boot ──────────────────────────────────────────────

// Signal the extension host that the webview is ready for content
initTabBar();
applyModeVisibility('preview', blocksContainer, sourceEditor, sourceTextarea);
vscode.postMessage({ type: 'ready' });
