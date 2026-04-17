# Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text CSS empty state with an animated ghost pen character, 100+ rotating witty quotes, and three action buttons (Start writing / Basic structure / Table template).

**Architecture:** New `media/emptyState.ts` module owns the empty state DOM lifecycle (create/destroy). New `media/emptyStateQuotes.ts` holds the quote pool. `modeHelpers.ts` stays unchanged (flag-only). `editor.ts` orchestrates show/hide based on the flag and handles action callbacks. CSS gets new styles replacing the old `::before` rule.

**Tech Stack:** TypeScript (browser context), CSS animations, inline SVG, jsdom + mocha + sinon for tests.

**Spec:** `docs/superpowers/specs/2026-04-15-empty-state-design.md`

---

### Task 1: Quote Pool

**Files:**
- Create: `media/emptyStateQuotes.ts`
- Create: `test/suite/emptyStateQuotes.test.ts`
- Modify: `test/tsconfig.test.json` (add `media/emptyStateQuotes.ts` to `include`)

- [ ] **Step 1: Write the failing tests**

Create `test/suite/emptyStateQuotes.test.ts`:

```typescript
import * as assert from 'assert';
import { EMPTY_STATE_QUOTES } from '../../media/emptyStateQuotes';

suite('emptyStateQuotes', () => {
  test('has at least 100 quotes', () => {
    assert.ok(
      EMPTY_STATE_QUOTES.length >= 100,
      `Expected ≥100 quotes, got ${EMPTY_STATE_QUOTES.length}`
    );
  });

  test('no duplicate quotes', () => {
    const unique = new Set(EMPTY_STATE_QUOTES);
    assert.strictEqual(
      unique.size,
      EMPTY_STATE_QUOTES.length,
      `Found ${EMPTY_STATE_QUOTES.length - unique.size} duplicate(s)`
    );
  });

  test('every quote is a non-empty trimmed string', () => {
    for (let i = 0; i < EMPTY_STATE_QUOTES.length; i++) {
      const q = EMPTY_STATE_QUOTES[i];
      assert.ok(typeof q === 'string' && q.length > 0, `Quote at index ${i} is empty`);
      assert.strictEqual(q, q.trim(), `Quote at index ${i} has leading/trailing whitespace`);
    }
  });

  test('no quote exceeds 100 characters', () => {
    for (let i = 0; i < EMPTY_STATE_QUOTES.length; i++) {
      assert.ok(
        EMPTY_STATE_QUOTES[i].length <= 100,
        `Quote at index ${i} is ${EMPTY_STATE_QUOTES[i].length} chars (max 100): "${EMPTY_STATE_QUOTES[i]}"`
      );
    }
  });
});
```

- [ ] **Step 2: Add `media/emptyStateQuotes.ts` to test tsconfig**

In `test/tsconfig.test.json`, change the `include` array:

```json
"include": ["./**/*", "../src/**/*", "../media/inlineEditor.ts", "../media/emptyStateQuotes.ts", "../media/emptyState.ts"]
```

(Adding both new media files now so we don't revisit this in Task 2.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../media/emptyStateQuotes'`

- [ ] **Step 4: Write the quote pool**

Create `media/emptyStateQuotes.ts`:

```typescript
export const EMPTY_STATE_QUOTES: string[] = [
  "Start with a heading. Or don't. We won't judge.",
  "This page is technically infinite. No pressure.",
  "The backspace key works too. Just saying.",
  "Markdown: because HTML has too many angle brackets.",
  "You're one # away from greatness.",
  "An empty page walks into a bar. The bartender says, 'No body?'",
  "The cursor blinks. The page waits. A love story.",
  "Your future README starts here.",
  "Plot twist: the real content was the friends we made along the way.",
  "Tip: words go here.",
  "In the beginning, there was nothing. Then someone pressed a key.",
  "This space intentionally left blank. For now.",
  "A journey of a thousand words begins with a single keystroke.",
  "Fun fact: this editor won't judge your grammar. Mostly.",
  "Type something. Anything. The page believes in you.",
  "Roses are red, violets are blue, this page is empty, and waiting for you.",
  "Welcome. The page is your oyster. Or canvas. Or whatever metaphor you prefer.",
  "Psst. The source mode is where the magic happens.",
  "You miss 100% of the headings you don't type.",
  "Today's forecast: a blank page with a chance of brilliance.",
  "Breaking news: local page still empty. More at 11.",
  "This page has been staring at you for 0 seconds.",
  "No content detected. Deploying motivational quote.",
  "Achievement unlocked: opened an empty file.",
  "Error 404: content not found. Just kidding. Start typing.",
  "The pen is mightier than the sword. The keyboard is mightier than both.",
  "Warning: writing may lead to satisfaction.",
  "Blank pages are just documents with commitment issues.",
  "Three backticks walk into a bar. The rest is fenced off.",
  "Some call it empty. We call it full of potential.",
  "Protip: Ctrl+` toggles source mode. You're welcome.",
  "What's the markdown for a blank stare? Asking for a friend.",
  "This page is minimalist by default. Maximalist by choice.",
  "A wise dev once said: 'Just start typing.'",
  "This is your page. There are many like it, but this one is yours.",
  "Every great document started as an empty file.",
  "The only thing standing between you and a great doc is a keystroke.",
  "Loading content... just kidding, that's your job.",
  "Friendly reminder: you can't save what doesn't exist yet.",
  "Bold move opening an empty file. We respect that.",
  "Behind every great project is a README that was once this empty.",
  "Your words here could change the world. Or at least confuse a coworker.",
  "A blank page is like a fresh cup of coffee — full of possibility.",
  "This page is judging you silently. Write something already.",
  "Psst — try ## for a subheading. It's life-changing.",
  "The page patiently waits. It has nowhere else to be.",
  "You opened this file on purpose, right?",
  "Unwritten content: the dark matter of documentation.",
  "Writer's block? Try writing 'Hello World'. Classic for a reason.",
  "This file is as empty as a promise to update the docs.",
  "One does not simply leave a markdown file empty.",
  "Pages written today: 0. But who's counting?",
  "Even Shakespeare started with a blank page. Probably.",
  "Fun fact: you can't have typos if you haven't typed anything.",
  "Idle thought: what if the content was inside us all along?",
  "Markdown tip: # is for headings, not existential crises.",
  "You know what would look great here? Words.",
  "Currently buffering... content needed.",
  "This emptiness is a feature, not a bug.",
  "Write first, edit later. That's what Ctrl+Z is for.",
  "Abandon all blankness, ye who enter here.",
  "Table for one? Try the table template below.",
  "Congratulations! You've found the world's most patient page.",
  "This page is a canvas. Your keyboard is the brush. We'll stop now.",
  "Life is short. Write the docs.",
  "Ah, the sweet sound of nothing. Type to ruin it.",
  "Still empty? This page will wait. It's very polite.",
  "Your keyboard has over 100 keys. Any one of them works here.",
  "To write, or not to write. That's not even a question here.",
  "Step 1: Type. Step 2: There is no step 2.",
  "Empty pages don't write themselves. Yet.",
  "If you stare at the page long enough, it stares back.",
  "This page rates your content 10/10. It hasn't seen any yet, but it's optimistic.",
  "Plot twist: the page was inside you all along.",
  "Your magnum opus starts with a single character.",
  "Knock knock. Who's there? Not your content, apparently.",
  "This document has great potential. Like, literally nothing but potential.",
  "Somewhere, a technical writer just felt a disturbance in the force.",
  "The blank page: nature's way of saying 'your turn'.",
  "README? More like READ-ME-WHEN-I-EXIST.",
  "Hot take: empty files deserve love too.",
  "0 words written. Infinity words to go.",
  "Current word count: aspirational.",
  "This page is powered by good intentions and zero content.",
  "Your future self will thank you for writing this. Probably.",
  "Markdown: turning # into headings since 2004.",
  "If this page were a restaurant, the menu would be blank.",
  "Write like no one is reading. Because no one is. Yet.",
  "Fun fact: the average markdown file is not this empty.",
  "This is either a blank page or modern art. You decide.",
  "Caution: contents may shift during editing.",
  "Draft zero: the bravest draft of all.",
  "All dressed up with no content to show.",
  "The void gazes back. It suggests a heading.",
  "Two roads diverged in an empty file. Both lead to source mode.",
  "This isn't writer's block. It's a creative pause.",
  "Somewhere out there, a heading is waiting to be written.",
  "Keep calm and write markdown.",
  "First rule of empty pages: you do not talk about empty pages.",
  "May the source be with you.",
  "Git commit -m 'added nothing'. We've all been there.",
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: All `emptyStateQuotes` tests PASS (100 quotes, no duplicates, all trimmed, all under 100 chars)

- [ ] **Step 6: Commit**

```bash
git add media/emptyStateQuotes.ts test/suite/emptyStateQuotes.test.ts test/tsconfig.test.json
git commit -m "feat(empty-state): add 100+ witty quote pool with tests"
```

---

### Task 2: Empty State DOM Module

**Files:**
- Create: `media/emptyState.ts`
- Create: `test/suite/emptyState.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/suite/emptyState.test.ts`:

```typescript
import * as assert from 'assert';
import * as sinon from 'sinon';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

(global as Record<string, unknown>)['window'] = dom.window;
(global as Record<string, unknown>)['document'] = dom.window.document;
(global as Record<string, unknown>)['HTMLElement'] = dom.window.HTMLElement;

import { createEmptyState, destroyEmptyState, type EmptyStateAction } from '../../media/emptyState';

suite('emptyState', () => {
  let container: HTMLElement;

  setup(() => {
    container = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(container);
  });

  teardown(() => {
    container.remove();
    sinon.restore();
  });

  test('createEmptyState appends DOM to container', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'test quote');

    const el = container.querySelector('.empty-state');
    assert.ok(el, 'empty-state element should exist');
  });

  test('createEmptyState renders the ghost pen SVG with aria-hidden', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const svg = container.querySelector('.empty-state-character svg');
    assert.ok(svg, 'SVG should exist inside character container');
    assert.strictEqual(svg!.getAttribute('aria-hidden'), 'true');
  });

  test('pickQuote parameter controls quote selection', () => {
    createEmptyState(container, false, sinon.spy(), () => 'custom quote here');

    const quote = container.querySelector('.empty-state-quote');
    assert.ok(quote);
    assert.strictEqual(quote!.textContent, 'custom quote here');
  });

  test('quote is a plain <p> element', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const quote = container.querySelector('.empty-state-quote');
    assert.ok(quote);
    assert.strictEqual(quote!.tagName, 'P');
    assert.strictEqual(quote!.getAttribute('role'), null);
  });

  test('createEmptyState renders three action buttons when not readOnly', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const buttons = container.querySelectorAll('.empty-state-btn');
    assert.strictEqual(buttons.length, 3);

    const labels = Array.from(buttons).map(b => b.textContent);
    assert.deepStrictEqual(labels, ['Start writing', 'Basic structure', 'Table template']);
  });

  test('readOnly omits action buttons', () => {
    createEmptyState(container, true, sinon.spy(), () => 'q');

    const buttons = container.querySelectorAll('.empty-state-btn');
    assert.strictEqual(buttons.length, 0);
  });

  test('readOnly shows fallback message', () => {
    createEmptyState(container, true, sinon.spy(), () => 'q');

    const quote = container.querySelector('.empty-state-quote');
    assert.ok(quote);
    assert.strictEqual(quote!.textContent, 'Nothing here.');
  });

  test('button click fires correct action: start-writing', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'q');

    const btn = container.querySelectorAll('.empty-state-btn')[0] as HTMLButtonElement;
    btn.click();
    assert.ok(onAction.calledOnceWithExactly('start-writing'));
  });

  test('button click fires correct action: basic-structure', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'q');

    const btn = container.querySelectorAll('.empty-state-btn')[1] as HTMLButtonElement;
    btn.click();
    assert.ok(onAction.calledOnceWithExactly('basic-structure'));
  });

  test('button click fires correct action: table-template', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'q');

    const btn = container.querySelectorAll('.empty-state-btn')[2] as HTMLButtonElement;
    btn.click();
    assert.ok(onAction.calledOnceWithExactly('table-template'));
  });

  test('destroyEmptyState removes all empty state DOM', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');
    assert.ok(container.querySelector('.empty-state'));

    destroyEmptyState(container);
    assert.strictEqual(container.querySelector('.empty-state'), null);
  });

  test('destroyEmptyState on container without empty state is a no-op', () => {
    assert.doesNotThrow(() => destroyEmptyState(container));
  });

  test('calling createEmptyState twice does not duplicate DOM', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const elements = container.querySelectorAll('.empty-state');
    assert.strictEqual(elements.length, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../media/emptyState'`

- [ ] **Step 3: Write the emptyState module**

Create `media/emptyState.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: All `emptyState` tests PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add media/emptyState.ts test/suite/emptyState.test.ts
git commit -m "feat(empty-state): add emptyState DOM module with ghost pen + action buttons"
```

---

### Task 3: CSS Styles

**Files:**
- Modify: `media/editor.css:82-101` (replace old empty state rules)

- [ ] **Step 1: Remove old empty state CSS and add new styles**

In `media/editor.css`, replace lines 82–101 (the `#blocks[data-empty="true"]` and `#blocks[data-empty="true"]::before` rules) with:

```css
/* ─── Empty state ──────────────────────────────────── */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  min-height: 320px;
  margin-top: var(--sp-8);
  padding: var(--sp-6);
  text-align: center;
  animation: emptyStateFadeIn 400ms var(--ease-out) both;
}

@keyframes emptyStateFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .empty-state {
    animation: none;
  }
  .empty-state-character {
    animation: none !important;
  }
}

.empty-state-character {
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  animation: ghostPenBob 3s ease-in-out infinite;
}

@keyframes ghostPenBob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

.empty-state-quote {
  max-width: 36ch;
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-family: var(--font-body);
  font-size: 1.05em;
  line-height: 1.7;
  font-style: italic;
}

.empty-state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  justify-content: center;
  margin-top: var(--sp-2);
}

.empty-state-btn {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 999px;
  background: transparent;
  color: var(--vscode-foreground);
  font-family: var(--font-body);
  font-size: 0.85em;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out),
              border-color var(--dur-mid) var(--ease-snap),
              background var(--dur-mid) var(--ease-snap);
}

.empty-state-btn:hover {
  transform: scale(1.03);
  border-color: var(--vscode-focusBorder);
  background: color-mix(in srgb, var(--vscode-focusBorder) 10%, transparent);
}

.empty-state-btn:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Build webview to verify CSS compiles**

Run: `npm run build:webview`
Expected: `Webview bundle built: media/editor.js`

- [ ] **Step 3: Commit**

```bash
git add media/editor.css
git commit -m "feat(empty-state): replace old CSS with ghost pen + button styles"
```

---

### Task 4: Wire Into Editor

**Files:**
- Modify: `media/editor.ts` (import and call emptyState functions, handle actions)

- [ ] **Step 1: Add imports at the top of `media/editor.ts`**

After the existing import of `modeHelpers`, add:

```typescript
import { createEmptyState, destroyEmptyState, type EmptyStateAction } from './emptyState';
```

- [ ] **Step 2: Add the template constants and action handler**

After the `syncBtn.addEventListener('click', triggerSave);` line (line 67), add:

```typescript
// ─── Empty state ──────────────────────────────────────

const TEMPLATE_BASIC = `# Title

Your content here.

## Section

More content.`;

const TEMPLATE_TABLE = `# Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
| Data     | Data     | Data     |`;

function handleEmptyStateAction(action: EmptyStateAction): void {
  if (action === 'start-writing') {
    switchMode('source');
    return;
  }
  const template = action === 'basic-structure' ? TEMPLATE_BASIC : TEMPLATE_TABLE;
  renderAll(template, blocksContainer, handleBlockClick);
  postEdit(template);
  switchMode('source');
}

function syncEmptyState(content: string): void {
  updateEmptyState(content, blocksContainer);
  if (blocksContainer.dataset['empty'] === 'true') {
    createEmptyState(blocksContainer, !!currentConfig.readOnly, handleEmptyStateAction);
  } else {
    destroyEmptyState(blocksContainer);
  }
}
```

- [ ] **Step 3: Replace all `updateEmptyState(...)` calls with `syncEmptyState(...)`**

There are two call sites in `editor.ts`:

1. Line 85 (inside `case 'update'`, preview branch):
   Replace `updateEmptyState(data.content, blocksContainer);` with `syncEmptyState(data.content);`

2. Line 368 (inside `switchMode`, preview branch):
   Replace `updateEmptyState(content, blocksContainer);` with `syncEmptyState(content);`

- [ ] **Step 4: Build and compile**

Run: `npm run compile && npm run build:webview`
Expected: Both pass with no errors.

- [ ] **Step 5: Run all tests**

Run: `npm run test:unit`
Expected: All tests pass (existing + new). The `modeHelpers.test.ts` tests for `updateEmptyState` still pass unchanged because `modeHelpers.ts` was not modified.

- [ ] **Step 6: Commit**

```bash
git add media/editor.ts
git commit -m "feat(empty-state): wire emptyState module into editor with action handlers"
```

---

### Task 5: Manual Verification

- [ ] **Step 1: Open an empty `.md` file in the Extension Development Host (F5)**

Verify:
- Ghost pen character is visible with a subtle floating animation
- A witty quote is displayed below the character
- Three pill buttons appear: "Start writing", "Basic structure", "Table template"
- Reloading the webview shows a different quote

- [ ] **Step 2: Test each action button**

- Click "Start writing" → switches to source mode with an empty textarea
- Click "Basic structure" (on a fresh empty file) → inserts heading + paragraph skeleton, switches to source mode with template visible
- Click "Table template" (on a fresh empty file) → inserts GFM table, switches to source mode with table visible

- [ ] **Step 3: Test read-only empty state**

Open the SCM diff view for an empty file. The original (left) panel should show:
- Ghost pen character
- "Nothing here." message
- No action buttons

- [ ] **Step 4: Test empty state teardown**

- Open an empty file (empty state shows)
- Switch to source mode, type some content, switch back to preview
- Verify the empty state is gone and the content is rendered

- [ ] **Step 5: Test reduced motion**

In the OS, enable "Reduce motion" / "Show animations" off. Reload the webview. Verify:
- Ghost pen does not bob
- Empty state still appears but without animations

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: No errors or warnings.

- [ ] **Step 7: Final test run**

Run: `npm run test:unit`
Expected: All tests pass.

- [ ] **Step 8: Commit any remaining fixes**

If any manual testing revealed issues that needed fixes, commit them:

```bash
git add -A
git commit -m "fix(empty-state): address issues found during manual verification"
```
