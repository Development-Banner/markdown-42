// Webview context — compiled by esbuild, runs in browser sandbox

import { parseBlocks, serializeBlocks } from '../src/parser/blockParser';
import { renderMarkdown } from '../src/parser/markdownParser';
import type { HeadingNode } from '../src/editor/MessageBus';

export interface RenderedBlock {
  index: number;
  raw: string;
  html: string;
  startLine: number;
}

let _renderedBlocks: RenderedBlock[] = [];

export function getRenderedBlocks(): RenderedBlock[] {
  return _renderedBlocks;
}

/**
 * Full render: parse all blocks and render each to HTML.
 * Used on initial load and when content changes significantly.
 */
export function renderAll(
  markdown: string,
  container: HTMLElement,
  onBlockClick: (index: number, block: RenderedBlock) => void
): RenderedBlock[] {
  const blocks = parseBlocks(markdown);

  _renderedBlocks = blocks.map(b => ({
    index: b.index,
    raw: b.raw,
    html: renderMarkdown(b.raw),
    startLine: b.startLine,
  }));

  // Use requestAnimationFrame to batch DOM writes — prevents layout thrashing
  requestAnimationFrame(() => {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (const rb of _renderedBlocks) {
      const div = createBlockElement(rb, onBlockClick);
      fragment.appendChild(div);
    }

    container.appendChild(fragment);
  });

  return _renderedBlocks;
}

/**
 * Incremental update: only re-render blocks that have changed.
 * Compares by raw content — unchanged blocks keep their DOM nodes intact.
 */
export function renderUpdate(
  newMarkdown: string,
  container: HTMLElement,
  onBlockClick: (index: number, block: RenderedBlock) => void
): RenderedBlock[] {
  const newBlocks = parseBlocks(newMarkdown);
  const oldBlocks = _renderedBlocks;

  // ── Data phase (synchronous) ──────────────────────────
  // Build newRendered and track which indices need a DOM update.
  // This runs synchronously so _renderedBlocks is correct immediately.
  const newRendered: RenderedBlock[] = [];
  const changedIndices: number[] = [];

  for (let i = 0; i < newBlocks.length; i++) {
    const nb = newBlocks[i];
    const ob = oldBlocks[i];

    if (ob && ob.raw === nb.raw) {
      newRendered.push(ob);
    } else {
      const rendered: RenderedBlock = {
        index: i,
        raw: nb.raw,
        html: renderMarkdown(nb.raw),
        startLine: nb.startLine,
      };
      newRendered.push(rendered);
      changedIndices.push(i);
    }
  }

  _renderedBlocks = newRendered;

  // ── DOM phase (deferred) ──────────────────────────────
  // Only touch the DOM in rAF to avoid layout thrashing.
  requestAnimationFrame(() => {
    const existingElements = Array.from(
      container.querySelectorAll<HTMLElement>('.block')
    );

    for (const i of changedIndices) {
      const existingEl = existingElements[i];
      // Never replace a block the user is actively editing — the rAF would
      // destroy the textarea and restore stale rendered content.
      if (existingEl?.classList.contains('editing')) continue;

      const newEl = createBlockElement(newRendered[i], onBlockClick);
      if (existingEl) {
        container.replaceChild(newEl, existingEl);
      } else {
        container.appendChild(newEl);
      }
    }

    // Remove extra blocks if document shrank
    for (let i = newBlocks.length; i < existingElements.length; i++) {
      existingElements[i].remove();
    }
  });

  return newRendered;
}

/**
 * Creates a block <div> element.
 * Security: uses innerHTML only with rendered HTML from markdown-it (html: false).
 * Raw user strings are never inserted with innerHTML — always textContent.
 */
function createBlockElement(
  block: RenderedBlock,
  onClick: (index: number, block: RenderedBlock) => void
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'block';
  div.dataset['blockIndex'] = String(block.index);
  div.dataset['startLine'] = String(block.startLine);
  div.setAttribute('role', 'region');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', `Content block ${block.index + 1}`);

  // Security: markdown-it renders with html:false, so this HTML is safe
  div.innerHTML = block.html;

  // Prevent the block div from stealing focus from an active textarea when
  // the user clicks in the padding area (outside the textarea, inside the block).
  // Without this, clicking the padding area blurs the textarea, triggering
  // the blur→commit cycle and destroying the textarea mid-selection.
  div.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (div.classList.contains('editing')) {
      e.preventDefault(); // Keep focus on the textarea
    }
  });

  div.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Don't enter edit mode when clicking a link
    if (target.tagName === 'A' || target.closest('a')) return;
    // Textarea clicks bubble here but must not re-trigger edit mode —
    // the textarea is already the active editor for this block.
    if (target.tagName === 'TEXTAREA') return;
    onClick(block.index, block);
  });

  div.addEventListener('keydown', (e) => {
    // Only activate via keyboard when the block div itself is focused.
    // If a child element (e.g. textarea) dispatched the event and it bubbled
    // here, we must not re-enter edit mode.
    if (e.target !== div) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(block.index, block);
    }
  });

  return div;
}

/**
 * Extracts heading nodes from rendered blocks for the outline.
 */
export function extractHeadings(
  container: HTMLElement
): HeadingNode[] {
  const headings: HeadingNode[] = [];
  const blocks = container.querySelectorAll<HTMLElement>('.block');

  blocks.forEach(blockEl => {
    const startLine = parseInt(blockEl.dataset['startLine'] ?? '0', 10);
    const hEls = blockEl.querySelectorAll<HTMLHeadingElement>(
      'h1, h2, h3, h4, h5, h6'
    );
    hEls.forEach((h, i) => {
      const level = parseInt(h.tagName[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
      // Security: use textContent, never innerHTML, for heading text
      const text = h.textContent?.trim() ?? '';
      const id = `heading-${startLine}-${i}`;
      h.id = id;
      headings.push({ level, text, line: startLine, id });
    });
  });

  return headings;
}

/**
 * Reconstruct full markdown from current rendered blocks (used for edits).
 */
export function serializeCurrentBlocks(): string {
  return serializeBlocks(
    _renderedBlocks.map((rb, i) => ({
      index: i,
      raw: rb.raw,
      startLine: rb.startLine,
      type: 'paragraph' as const,
    }))
  );
}
