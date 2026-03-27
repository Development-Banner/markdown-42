// Webview brain — compiled by esbuild to media/editor.js
// Runs in the VS Code webview sandbox (browser context, no Node.js APIs).

import { renderAll, renderUpdate, extractHeadings, getRenderedBlocks, serializeCurrentBlocks } from './renderer';
import { enterEditMode, isEditing, getActiveBlockIndex, commitActiveEdit } from './inlineEditor';
import type { HostToWebview, WebviewToHost, WebviewConfig } from '../src/editor/MessageBus';

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
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let hasUnsavedChanges = false;

// ─── Save indicator ─────────────────────────────────

function markUnsaved(): void {
  if (hasUnsavedChanges) return;
  hasUnsavedChanges = true;
  saveBtn.classList.add('unsaved');
  saveBtn.title = 'Unsaved changes — click to save (Ctrl+S)';
}

function markSaved(): void {
  hasUnsavedChanges = false;
  saveBtn.classList.remove('unsaved');
  saveBtn.title = 'Save (Ctrl+S)';
}

function triggerSave(): void {
  vscode.postMessage({ type: 'save' });
  markSaved();
}

// ─── Save button ────────────────────────────────────

const saveBtn = document.createElement('button');
saveBtn.id = 'save-btn';
saveBtn.title = 'Save (Ctrl+S)';
saveBtn.setAttribute('aria-label', 'Save file');
saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13.353 1.146l1.5 1.5A.5.5 0 0 1 15 3v11.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H13a.5.5 0 0 1 .353.146zM10 2H6v3h4V2zm1 0v3.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5V2H2v12h12V3.207L12.793 2H11zm-3 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>';
saveBtn.addEventListener('click', triggerSave);
document.body.appendChild(saveBtn);

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
    localVersion++;
    vscode.postMessage({ type: 'edit', content, version: localVersion });
    markUnsaved();
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

function switchMode(mode: 'preview' | 'source'): void {
  window.scrollTo(0, 0);
  updateTabBar(mode);
  currentMode = mode;
  if (mode === 'source') {
    const content = serializeCurrentBlocks();
    sourceTextarea.value = content;
    sourceEditor.hidden = false;
    blocksContainer.hidden = true;
    sourceTextarea.focus();
  } else {
    sourceEditor.hidden = true;
    blocksContainer.hidden = false;
    // Re-render from source textarea if it was modified
    const content = sourceTextarea.value;
    if (content) {
      renderAll(content, blocksContainer, handleBlockClick);
      sendOutline();
      // Sync edit back to host
      localVersion++;
      vscode.postMessage({ type: 'edit', content, version: localVersion });
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
    localVersion++;
    vscode.postMessage({
      type: 'edit',
      content: sourceTextarea.value,
      version: localVersion,
    });
    markUnsaved();
  }, currentConfig.renderDelay);
});

// ─── Config application ────────────────────────────────

function applyConfig(config: WebviewConfig): void {
  currentConfig = config;
  const root = document.documentElement;
  root.style.setProperty('--content-width', `${config.lineWidth}px`);
  root.style.setProperty('--base-font-size', `${config.fontSize}px`);

  if (config.mode !== currentMode) {
    switchMode(config.mode);
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
vscode.postMessage({ type: 'ready' });
