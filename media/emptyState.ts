import { EMPTY_STATE_QUOTES } from './emptyStateQuotes';

export type EmptyStateAction = 'start-writing' | 'basic-structure' | 'table-template';

const GHOST_PEN_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <!-- Ghost body -->
  <path d="M20 52 C20 52 20 58 24 58 C28 58 28 52 32 52 C36 52 36 58 40 58 C44 58 44 52 44 52 L44 24 C44 17.4 38.6 12 32 12 C25.4 12 20 17.4 20 24 Z"
        fill="currentColor" opacity="0.13"/>
  <!-- Ghost outline -->
  <path d="M20 52 C20 52 20 58 24 58 C28 58 28 52 32 52 C36 52 36 58 40 58 C44 58 44 52 44 52 L44 24 C44 17.4 38.6 12 32 12 C25.4 12 20 17.4 20 24 Z"
        stroke="currentColor" stroke-width="2" fill="none" opacity="0.5"/>
  <!-- Eyes -->
  <circle cx="27" cy="28" r="2.5" fill="currentColor" opacity="0.6"/>
  <circle cx="37" cy="28" r="2.5" fill="currentColor" opacity="0.6"/>
  <!-- Pen nib -->
  <path d="M32 36 L28 48 L32 46 L36 48 Z"
        fill="currentColor" opacity="0.4"/>
  <!-- Pen tip -->
  <line x1="32" y1="46" x2="32" y2="52" stroke="currentColor" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
</svg>`;

function defaultPickQuote(quotes: string[]): string {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function createEmptyState(
  container: HTMLElement,
  readOnly: boolean,
  onAction: (action: EmptyStateAction) => void,
  pickQuote: (quotes: string[]) => string = defaultPickQuote
): void {
  // No-op if already present
  if (container.querySelector('.empty-state')) return;

  const wrapper = container.ownerDocument.createElement('div');
  wrapper.className = 'empty-state';

  // Ghost pen character
  const character = container.ownerDocument.createElement('div');
  character.className = 'empty-state-character';
  character.innerHTML = GHOST_PEN_SVG;
  wrapper.appendChild(character);

  // Quote
  const quote = container.ownerDocument.createElement('p');
  quote.className = 'empty-state-quote';
  quote.textContent = readOnly ? 'Nothing here.' : pickQuote(EMPTY_STATE_QUOTES);
  wrapper.appendChild(quote);

  // Action buttons (skip in read-only mode)
  if (!readOnly) {
    const actions = container.ownerDocument.createElement('div');
    actions.className = 'empty-state-actions';

    const buttons: { label: string; action: EmptyStateAction }[] = [
      { label: 'Start writing', action: 'start-writing' },
      { label: 'Basic structure', action: 'basic-structure' },
      { label: 'Table template', action: 'table-template' },
    ];

    for (const { label, action } of buttons) {
      const btn = container.ownerDocument.createElement('button');
      btn.className = 'empty-state-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => onAction(action));
      actions.appendChild(btn);
    }

    wrapper.appendChild(actions);
  }

  container.appendChild(wrapper);
}

export function destroyEmptyState(container: HTMLElement): void {
  const el = container.querySelector('.empty-state');
  if (el) el.remove();
}
