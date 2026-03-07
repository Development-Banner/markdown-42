// Webview context — compiled by esbuild, runs in browser sandbox

export interface InlineEditorCallbacks {
  onCommit: (blockIndex: number, newRaw: string) => void;
  onCancel: (blockIndex: number) => void;
}

let _activeBlockIndex: number | null = null;
let _activeTextarea: HTMLTextAreaElement | null = null;
let _activeCallbacks: InlineEditorCallbacks | null = null;

/**
 * Enter inline edit mode for a block.
 * Hides ALL rendered children and shows a textarea with raw markdown.
 */
export function enterEditMode(
  blockEl: HTMLElement,
  rawMarkdown: string,
  blockIndex: number,
  callbacks: InlineEditorCallbacks,
  renderDelay: number
): void {
  // Commit any in-progress edit before opening a new one
  if (_activeBlockIndex !== null && _activeBlockIndex !== blockIndex) {
    _commitActive();
  }

  if (_activeBlockIndex === blockIndex) return;

  _activeBlockIndex = blockIndex;
  _activeCallbacks = callbacks;
  blockEl.classList.add('editing');

  // Hide ALL rendered children (not just the first) so none overlap the textarea
  const renderedChildren = Array.from(blockEl.children) as HTMLElement[];
  renderedChildren.forEach(child => {
    (child as HTMLElement).dataset['hiddenByEditor'] = '1';
    (child as HTMLElement).style.display = 'none';
  });

  const textarea = document.createElement('textarea');
  textarea.value = rawMarkdown;
  textarea.setAttribute('aria-label', 'Edit block content — Esc to cancel, Ctrl+Enter to save');
  textarea.setAttribute('spellcheck', 'true');
  textarea.setAttribute('data-editor-textarea', '1');

  _activeTextarea = textarea;
  blockEl.appendChild(textarea);

  // Auto-resize immediately and on every input
  autoResize(textarea);
  textarea.addEventListener('input', () => autoResize(textarea));

  // Focus + cursor at end
  textarea.focus();
  const len = textarea.value.length;
  textarea.setSelectionRange(len, len);

  // Debounced commit on blur — delay gives time for Escape/Ctrl+Enter
  let blurTimer: ReturnType<typeof setTimeout> | null = null;

  textarea.addEventListener('blur', () => {
    blurTimer = setTimeout(() => {
      _commitBlock(blockEl, blockIndex, textarea.value, callbacks);
    }, renderDelay);
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Stop bubbling: the block div has a keydown listener that would
      // otherwise re-enter edit mode after cleanup clears _activeBlockIndex.
      e.stopPropagation();
      if (blurTimer) clearTimeout(blurTimer);
      _cancelBlock(blockEl, blockIndex, callbacks);
    }
    // Ctrl+Enter / Cmd+Enter = save immediately
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // Stop bubbling: block div keydown handler would re-enter edit mode
      // because _commitBlock runs _cleanup (sets _activeBlockIndex = null)
      // BEFORE the event reaches the block div, so the guard misses it.
      e.stopPropagation();
      if (blurTimer) clearTimeout(blurTimer);
      _commitBlock(blockEl, blockIndex, textarea.value, callbacks);
    }
  });
}

function _commitBlock(
  blockEl: HTMLElement,
  blockIndex: number,
  value: string,
  callbacks: InlineEditorCallbacks
): void {
  _cleanup(blockEl);
  callbacks.onCommit(blockIndex, value);
}

function _cancelBlock(
  blockEl: HTMLElement,
  blockIndex: number,
  callbacks: InlineEditorCallbacks
): void {
  _cleanup(blockEl);
  callbacks.onCancel(blockIndex);
}

/** Commit whichever block is currently active, using its stored callbacks. */
function _commitActive(): void {
  if (_activeBlockIndex === null || _activeTextarea === null || _activeCallbacks === null) {
    return;
  }
  const blockEl = document.querySelector<HTMLElement>(
    `[data-block-index="${_activeBlockIndex}"]`
  );
  if (blockEl) {
    _commitBlock(blockEl, _activeBlockIndex, _activeTextarea.value, _activeCallbacks);
  }
}

function _cleanup(blockEl: HTMLElement): void {
  _activeBlockIndex = null;
  _activeCallbacks = null;
  _activeTextarea = null;
  blockEl.classList.remove('editing');

  // Remove the textarea
  const textarea = blockEl.querySelector<HTMLElement>('[data-editor-textarea]');
  textarea?.remove();

  // Restore ALL hidden children
  (Array.from(blockEl.children) as HTMLElement[]).forEach(child => {
    if ((child as HTMLElement).dataset['hiddenByEditor']) {
      (child as HTMLElement).style.display = '';
      delete (child as HTMLElement).dataset['hiddenByEditor'];
    }
  });
}

function autoResize(textarea: HTMLTextAreaElement): void {
  // Reset then measure natural scroll height
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
}

/**
 * Imperatively commit the active edit from outside the module.
 * Used by the editor to commit before deferring a new edit mode entry.
 */
export function commitActiveEdit(): void {
  _commitActive();
}

export function isEditing(): boolean {
  return _activeBlockIndex !== null;
}

export function getActiveBlockIndex(): number | null {
  return _activeBlockIndex;
}
