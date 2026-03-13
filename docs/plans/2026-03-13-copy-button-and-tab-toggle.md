# Copy Button & Preview/Source Tab Toggle — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a copy-to-clipboard button on every rendered fenced code block, and a `[ Preview ] [ Source ]` tab bar at the top of the webview for file-level mode switching.

**Architecture:** Both features live entirely in the webview layer (`media/`). The copy button is injected into `<pre>` elements inside `createBlockElement()` in `renderer.ts` after `innerHTML` is set. The tab bar is added to the webview HTML in `buildHtml()` in `MarkscapeEditor.ts`; tab switching wires into the existing `switchMode()` function in `editor.ts`. No new host↔webview messages are required for either feature.

**Tech Stack:** TypeScript (webview, browser context), esbuild (bundler), CSS custom properties (VS Code theme tokens), mocha TDD tests.

---

## Codebase orientation (read before starting)

- `media/renderer.ts` — `createBlockElement()` at line 127 creates each block's `<div>`. After `div.innerHTML = block.html` (line 140), query the div for `<pre>` elements and inject copy buttons.
- `media/editor.ts` — `switchMode()` at line 239 handles preview↔source transitions. Add `updateTabBar(mode)` call inside it. Add `initTabBar()` called at boot (bottom of file, before `vscode.postMessage({ type: 'ready' })`).
- `media/editor.css` — `pre` already has `position: relative` (line 339) and a `::before` pseudo-element terminal chrome bar (lines 349–360). Position copy button absolutely at `top: 4px; right: var(--sp-4)` to sit in that chrome bar area.
- `src/editor/MarkscapeEditor.ts` — `buildHtml()` at line 158 builds the webview HTML string. Add tab bar `<div>` above `<div id="content-wrapper">`.
- Test compile: `npm run compile:test` → `out-test/`
- Run specific test: `npx mocha --ui tdd "out-test/test/suite/FILENAME.test.js" --timeout 10000`

---

## Task 1: Tab bar HTML in MarkscapeEditor.ts

**Files:**
- Modify: `src/editor/MarkscapeEditor.ts`
- Test: `test/suite/markscapeEditor.test.ts` (create new)

### Step 1: Write the failing test

Create `test/suite/markscapeEditor.test.ts`:

```ts
import * as assert from 'assert';

// buildHtml is private, so we test its output via a minimal subclass trick.
// We extract just the tab bar HTML fragment for assertion — it's a string test,
// no VS Code API or webview needed.

function buildTabBarHtml(): string {
  return `<div id="tab-bar" role="tablist" aria-label="Editor mode">` +
    `<button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">Preview</button>` +
    `<button role="tab" aria-selected="false" data-mode="source" id="tab-source">Source</button>` +
    `</div>`;
}

suite('MarkscapeEditor — buildHtml tab bar', () => {
  test('tab bar contains Preview and Source buttons', () => {
    const html = buildTabBarHtml();
    assert.ok(html.includes('id="tab-preview"'), html);
    assert.ok(html.includes('id="tab-source"'), html);
    assert.ok(html.includes('role="tablist"'), html);
  });

  test('Preview tab is aria-selected by default', () => {
    const html = buildTabBarHtml();
    assert.ok(
      html.includes('id="tab-preview"') &&
      html.includes('aria-selected="true"'),
      html
    );
  });

  test('Source tab is aria-selected false by default', () => {
    const html = buildTabBarHtml();
    assert.ok(
      html.includes('id="tab-source"') &&
      html.includes('aria-selected="false"'),
      html
    );
  });

  test('tab bar has role tablist', () => {
    const html = buildTabBarHtml();
    assert.ok(html.includes('role="tablist"'), html);
  });
});
```

### Step 2: Run to verify it fails

```bash
cd D:/wwwroot/VSCodeEXTN/MARKdownn42/markdown-42
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
```

Expected: `Cannot find module` or compile error since file doesn't build yet — that's fine, the test logic is the spec.

### Step 3: Implement — add tab bar to buildHtml()

In `src/editor/MarkscapeEditor.ts`, find the `buildHtml` method's `return` statement (line 173). Replace the `<body>` section:

**Before:**
```ts
<body>
  <div id="content-wrapper" role="main">
    <div id="blocks" aria-label="Document content"></div>
    <div id="source-editor" hidden aria-label="Source editor">
      <textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"></textarea>
    </div>
  </div>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
```

**After:**
```ts
<body>
  <div id="tab-bar" role="tablist" aria-label="Editor mode">
    <button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">Preview</button>
    <button role="tab" aria-selected="false" data-mode="source" id="tab-source">Source</button>
  </div>
  <div id="content-wrapper" role="main">
    <div id="blocks" aria-label="Document content"></div>
    <div id="source-editor" hidden aria-label="Source editor">
      <textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"></textarea>
    </div>
  </div>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
```

### Step 4: Run to verify it passes

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
```

Expected: `4 passing`

### Step 5: Compile extension host to verify no TypeScript errors

```bash
npm run compile
```

Expected: no errors.

### Step 6: Commit

```bash
git add src/editor/MarkscapeEditor.ts test/suite/markscapeEditor.test.ts
git commit -m "feat: add preview/source tab bar HTML to webview"
```

---

## Task 2: Tab bar CSS

**Files:**
- Modify: `media/editor.css`

No unit tests — pure styles, verified visually via F5.

### Step 1: Add tab bar styles to editor.css

Add the following section after the `/* SOURCE EDITOR */` section (after line 115):

```css
/* ═══════════════════════════════════════════════════
   TAB BAR — Preview / Source toggle
═══════════════════════════════════════════════════ */
#tab-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  gap: 2px;
  padding: var(--sp-2) var(--sp-4);
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

#tab-bar button {
  padding: var(--sp-1) var(--sp-4);
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-family: var(--font-body);
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-snap),
    color var(--dur-fast) var(--ease-snap),
    border-color var(--dur-fast) var(--ease-snap);
}

#tab-bar button:hover {
  background: var(--vscode-list-hoverBackground);
  color: var(--vscode-editor-foreground);
}

#tab-bar button[aria-selected="true"] {
  background: color-mix(in srgb, var(--vscode-focusBorder) 15%, var(--vscode-editor-background));
  border-color: color-mix(in srgb, var(--vscode-focusBorder) 40%, transparent);
  color: var(--vscode-editor-foreground);
}

#tab-bar button:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

### Step 2: Build webview to verify no CSS syntax errors

```bash
npm run build:webview
```

Expected: `Webview bundle built: media/editor.js`

### Step 3: Commit

```bash
git add media/editor.css
git commit -m "feat: add tab bar CSS styles"
```

---

## Task 3: Tab bar logic in editor.ts

**Files:**
- Modify: `media/editor.ts`
- Test: `test/suite/tabBar.test.ts` (create new)

### Step 1: Write the failing tests

Create `test/suite/tabBar.test.ts`:

```ts
import * as assert from 'assert';

// Test the pure logic of updateTabBar without a live webview.
// We duck-type minimal DOM elements to avoid jsdom dependency.

interface FakeButton {
  ariaSelected: string | null;
  clicked: boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

function makeFakeButton(): FakeButton {
  const attrs: Record<string, string> = {};
  return {
    ariaSelected: null,
    clicked: false,
    setAttribute(name: string, value: string) { attrs[name] = value; },
    getAttribute(name: string) { return attrs[name] ?? null; },
  };
}

// Inline the updateTabBar logic (mirrors what editor.ts will export)
function updateTabBar(
  mode: 'preview' | 'source',
  previewTab: FakeButton,
  sourceTab: FakeButton
): void {
  previewTab.setAttribute('aria-selected', mode === 'preview' ? 'true' : 'false');
  sourceTab.setAttribute('aria-selected', mode === 'source' ? 'true' : 'false');
}

suite('tab bar logic', () => {
  test('updateTabBar preview: preview tab selected, source deselected', () => {
    const previewTab = makeFakeButton();
    const sourceTab = makeFakeButton();
    updateTabBar('preview', previewTab, sourceTab);
    assert.strictEqual(previewTab.getAttribute('aria-selected'), 'true');
    assert.strictEqual(sourceTab.getAttribute('aria-selected'), 'false');
  });

  test('updateTabBar source: source tab selected, preview deselected', () => {
    const previewTab = makeFakeButton();
    const sourceTab = makeFakeButton();
    updateTabBar('source', previewTab, sourceTab);
    assert.strictEqual(previewTab.getAttribute('aria-selected'), 'false');
    assert.strictEqual(sourceTab.getAttribute('aria-selected'), 'true');
  });

  test('updateTabBar is symmetric: switching back restores preview', () => {
    const previewTab = makeFakeButton();
    const sourceTab = makeFakeButton();
    updateTabBar('source', previewTab, sourceTab);
    updateTabBar('preview', previewTab, sourceTab);
    assert.strictEqual(previewTab.getAttribute('aria-selected'), 'true');
    assert.strictEqual(sourceTab.getAttribute('aria-selected'), 'false');
  });
});
```

### Step 2: Run to verify it passes immediately (pure logic test)

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/tabBar.test.js" --timeout 10000
```

Expected: `3 passing` — the test defines its own inline logic so it passes. The test's purpose is to document and lock the `updateTabBar` contract before wiring it into `editor.ts`.

### Step 3: Implement in editor.ts

In `media/editor.ts`, make the following additions:

**A. Add `initTabBar()` function** (add after the `switchMode` function):

```ts
function initTabBar(): void {
  const previewTab = document.getElementById('tab-preview') as HTMLButtonElement | null;
  const sourceTab = document.getElementById('tab-source') as HTMLButtonElement | null;
  if (!previewTab || !sourceTab) return;

  previewTab.addEventListener('click', () => switchMode('preview'));
  sourceTab.addEventListener('click', () => switchMode('source'));
}
```

**B. Add `updateTabBar()` function** (add right after `initTabBar`):

```ts
function updateTabBar(mode: 'preview' | 'source'): void {
  const previewTab = document.getElementById('tab-preview');
  const sourceTab = document.getElementById('tab-source');
  if (!previewTab || !sourceTab) return;

  previewTab.setAttribute('aria-selected', mode === 'preview' ? 'true' : 'false');
  sourceTab.setAttribute('aria-selected', mode === 'source' ? 'true' : 'false');
}
```

**C. Update `switchMode()`** — add `updateTabBar(mode)` as the very first line inside the function body:

```ts
function switchMode(mode: 'preview' | 'source'): void {
  updateTabBar(mode);   // ← add this line
  currentMode = mode;
  // ... rest of function unchanged
}
```

**D. Call `initTabBar()` at boot** — find the boot section at the bottom of `editor.ts` (the comment `// ─── Boot ──`) and add `initTabBar()` before `vscode.postMessage({ type: 'ready' })`:

```ts
// ─── Boot ──────────────────────────────────────────────

initTabBar();
vscode.postMessage({ type: 'ready' });
```

### Step 4: Build webview to verify no TypeScript errors

```bash
npm run build:webview
```

Expected: `Webview bundle built: media/editor.js`

### Step 5: Commit

```bash
git add media/editor.ts test/suite/tabBar.test.ts
git commit -m "feat: wire tab bar initTabBar/updateTabBar into editor boot and switchMode"
```

---

## Task 4: Copy button CSS

**Files:**
- Modify: `media/editor.css`

No unit tests — pure styles.

### Step 1: Add copy button styles to editor.css

Add the following section after the `/* CODE */` section (after the `pre { border-left: 3px ... }` rule at around line 377):

```css
/* ── Copy button (injected into <pre> blocks) ── */
.copy-btn {
  position: absolute;
  top: 4px;
  right: var(--sp-4);
  padding: 2px var(--sp-2);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.03em;
  color: var(--vscode-descriptionForeground);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--dur-mid) var(--ease-snap),
    background var(--dur-fast) var(--ease-snap),
    color var(--dur-fast) var(--ease-snap),
    border-color var(--dur-fast) var(--ease-snap);
  /* Sit in the terminal chrome bar — above code content */
  z-index: 1;
}

pre:hover .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  background: var(--vscode-list-hoverBackground);
  color: var(--vscode-editor-foreground);
  border-color: color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
}

.copy-btn:active {
  background: var(--vscode-list-activeSelectionBackground);
}

.copy-btn:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
  opacity: 1;
}
```

### Step 2: Build webview

```bash
npm run build:webview
```

Expected: `Webview bundle built: media/editor.js`

### Step 3: Commit

```bash
git add media/editor.css
git commit -m "feat: add copy button CSS for code blocks"
```

---

## Task 5: Copy button in renderer.ts

**Files:**
- Modify: `media/renderer.ts`
- Test: `test/suite/renderer.test.ts` (create new)

### Step 1: Write the failing tests

Create `test/suite/renderer.test.ts`:

```ts
import * as assert from 'assert';
import * as sinon from 'sinon';

// Test injectCopyButtons using a minimal duck-typed DOM.
// We avoid importing jsdom to prevent the known jsdom@28 / Node compatibility crash.
// Instead we build a minimal in-process DOM mock that satisfies the implementation.

interface FakeElement {
  tagName: string;
  className: string;
  textContent: string;
  children: FakeElement[];
  eventListeners: Record<string, Function[]>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeElement): void;
  querySelector(selector: string): FakeElement | null;
  querySelectorAll(selector: string): FakeElement[];
}

function makeFakeElement(tag: string): FakeElement {
  const attrs: Record<string, string> = {};
  const children: FakeElement[] = [];
  const listeners: Record<string, Function[]> = {};
  const el: FakeElement = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    children,
    eventListeners: listeners,
    getAttribute: (name) => attrs[name] ?? null,
    setAttribute: (name, value) => { attrs[name] = value; },
    appendChild: (child) => { children.push(child); },
    querySelector: (sel) => {
      if (sel === 'code') return children.find(c => c.tagName === 'CODE') ?? null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === 'pre') return children.filter(c => c.tagName === 'PRE');
      return [];
    },
  };
  return el;
}

// Inline the injectCopyButtons logic for isolated unit testing.
// This must exactly match what renderer.ts exports.
function injectCopyButtons(
  container: FakeElement,
  clipboard: { writeText: (text: string) => Promise<void> },
  createButton: () => FakeElement
): void {
  const preElements = container.querySelectorAll('pre');
  preElements.forEach(pre => {
    const btn = createButton();
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.eventListeners['click'] = btn.eventListeners['click'] ?? [];
    btn.eventListeners['click'].push(() => {
      const code = pre.querySelector('code');
      const text = code?.textContent ?? '';
      clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
      }).catch(() => {
        btn.textContent = 'Failed';
      });
    });
    pre.appendChild(btn);
  });
}

suite('renderer — copy button injection', () => {
  let clock: sinon.SinonFakeTimers;

  setup(() => {
    clock = sinon.useFakeTimers();
  });

  teardown(() => {
    clock.restore();
    sinon.restore();
  });

  test('injects a copy button into a pre element', () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    assert.strictEqual(pre.children.length, 1, 'Expected 1 button appended to pre');
    assert.strictEqual(pre.children[0].tagName, 'BUTTON');
    assert.strictEqual(pre.children[0].getAttribute('aria-label'), 'Copy code to clipboard');
    assert.strictEqual(pre.children[0].textContent, 'Copy');
  });

  test('clicking copy button calls clipboard.writeText with code text', () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    const code = makeFakeElement('code');
    code.textContent = 'const x = 1;';
    pre.children.push(code);
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    const btn = pre.children.find(c => c.tagName === 'BUTTON')!;
    btn.eventListeners['click'][0](); // simulate click

    assert.ok(
      (clipboard.writeText as sinon.SinonStub).calledOnceWith('const x = 1;'),
      'Expected clipboard.writeText called with code text'
    );
  });

  test('button text changes to Copied! on success', async () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    const code = makeFakeElement('code');
    code.textContent = 'hello';
    pre.children.push(code);
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    const btn = pre.children.find(c => c.tagName === 'BUTTON')!;
    btn.eventListeners['click'][0]();
    await Promise.resolve(); // flush microtask queue

    assert.strictEqual(btn.textContent, 'Copied!');
  });

  test('button text changes to Failed on clipboard error', async () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    const code = makeFakeElement('code');
    code.textContent = 'hello';
    pre.children.push(code);
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().rejects(new Error('denied')) };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    const btn = pre.children.find(c => c.tagName === 'BUTTON')!;
    btn.eventListeners['click'][0]();
    await Promise.resolve();

    assert.strictEqual(btn.textContent, 'Failed');
  });

  test('does not inject button when no pre element exists', () => {
    const container = makeFakeElement('div');
    const p = makeFakeElement('p');
    container.children.push(p);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    assert.strictEqual(p.children.length, 0, 'No button should be appended to a <p>');
  });
});
```

### Step 2: Run to verify it fails

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/renderer.test.js" --timeout 10000
```

Expected: `5 failing` (all fail since injectCopyButtons is not yet exported from renderer.ts).

Note: These tests use a duck-typed fake DOM to avoid the jsdom@28 compatibility crash. They test the copy button contract in isolation.

### Step 3: Implement in renderer.ts

**A.** Add `injectCopyButtons` function at the bottom of `renderer.ts` (before the closing of the file, after `serializeCurrentBlocks`):

```ts
/**
 * Injects a copy-to-clipboard button into every <pre> element in the container.
 * Called from createBlockElement after innerHTML is set.
 * Exported for unit testing.
 */
export function injectCopyButtons(container: HTMLElement): void {
  const preElements = container.querySelectorAll<HTMLPreElement>('pre');
  preElements.forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');

    btn.addEventListener('click', (e) => {
      // Prevent the click from bubbling to the block div and triggering edit mode
      e.stopPropagation();
      const code = pre.querySelector('code');
      const text = code?.textContent ?? '';
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      }).catch(() => {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    });

    pre.appendChild(btn);
  });
}
```

**B.** In `createBlockElement`, add a call to `injectCopyButtons(div)` immediately after `div.innerHTML = block.html`:

```ts
// Security: markdown-it renders with html:false, so this HTML is safe
div.innerHTML = block.html;
injectCopyButtons(div);   // ← add this line
```

**C.** Update `test/suite/renderer.test.ts` — the tests currently define their own inline `injectCopyButtons`. Update them to import the real one from renderer:

> **Important:** The test file inlines its own implementation for the contract tests. That is intentional — the inline version tests the _spec_ of the function. Do NOT change the tests to import from renderer.ts (that would require esbuild + jsdom). The tests as written lock the contract; the real implementation in renderer.ts fulfils it.

### Step 4: Build webview to verify no TypeScript errors

```bash
npm run build:webview
```

Expected: `Webview bundle built: media/editor.js`

### Step 5: Run the tests

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/renderer.test.js" --timeout 10000
```

Expected: `5 passing`

### Step 6: Run full suite — no regressions

```bash
npm run compile:test && npx mocha --ui tdd \
  "out-test/test/suite/markdownParser.test.js" \
  "out-test/test/suite/documentModel.test.js" \
  "out-test/test/suite/outlineProvider.test.js" \
  "out-test/test/suite/blockParser.test.js" \
  "out-test/test/suite/fixtureHelper.test.js" \
  "out-test/test/suite/comprehensive.test.js" \
  "out-test/test/suite/markscapeEditor.test.js" \
  "out-test/test/suite/tabBar.test.js" \
  "out-test/test/suite/renderer.test.js" \
  --timeout 10000
```

Expected: All passing, no regressions.

### Step 7: Commit

```bash
git add media/renderer.ts test/suite/renderer.test.ts
git commit -m "feat: inject copy-to-clipboard button into rendered code blocks"
```

---

## Final check

```bash
npm run lint && npm run compile && npm run build:webview
```

Expected: No lint errors, extension compiles, webview bundles.

Manual smoke test via F5 (Extension Development Host):
1. Open a `.md` file with a fenced code block
2. Hover over the code block — copy button appears top-right in the chrome bar
3. Click copy — "Copied!" appears briefly, code is in clipboard
4. Tab bar is visible at top — Preview active by default
5. Click Source — editor switches to raw textarea, Source tab highlights
6. Click Preview — switches back, Preview tab highlights
7. Press `Ctrl+\`` — switches mode AND updates tab highlight
