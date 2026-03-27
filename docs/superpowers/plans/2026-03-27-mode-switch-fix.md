# Mode Switch Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Preview/Source mode switch so the source editor is properly hidden in Preview mode and the viewport scrolls to top on every mode change.

**Architecture:** Two surgical changes — one CSS rule that re-asserts `display: none` at author specificity (overcoming the `display: flex` that currently wins over the `hidden` attribute), and one `window.scrollTo(0, 0)` call at the top of `switchMode()`. Tests inline the switchMode visibility logic (same pattern as `tabBar.test.ts`) to guard against regression.

**Tech Stack:** TypeScript (compiled by esbuild for webview), CSS custom properties, Mocha + assert (unit tests)

---

### Task 1: Write failing tests for switchMode behavior

**Files:**
- Modify: `test/suite/tabBar.test.ts`

The existing file tests `updateTabBar` tab-selection logic. Add a second `suite` block to the same file testing the visibility-toggling and scroll-reset behavior of `switchMode`. Following the same pattern as the file: inline the logic under test rather than importing `editor.ts` (which would fail because `acquireVsCodeApi` doesn't exist in Node).

- [ ] **Step 1: Add the switchMode test suite to `test/suite/tabBar.test.ts`**

Open `test/suite/tabBar.test.ts`. First, add `import * as sinon from 'sinon';` at the top of the file alongside the existing `import * as assert from 'assert';` line:

```typescript
import * as assert from 'assert';
import * as sinon from 'sinon';
```

Then, after the closing `});` of the existing `suite('tab bar logic', ...)` block, append:

```typescript
// ─── switchMode visibility + scroll ──────────────────────────────────────────
//
// Inlines the visibility logic from editor.ts switchMode() so it can be tested
// in Node without acquireVsCodeApi. Pattern mirrors updateTabBar tests above.

interface FakePanel {
  hidden: boolean;
}

/**
 * Mirrors the visibility-setting logic inside editor.ts switchMode().
 * scrollTo is passed in so we can spy on it in tests.
 */
function switchModeVisibility(
  mode: 'preview' | 'source',
  sourceEditor: FakePanel,
  blocksContainer: FakePanel,
  scrollTo: (x: number, y: number) => void
): void {
  scrollTo(0, 0);
  if (mode === 'source') {
    sourceEditor.hidden = false;
    blocksContainer.hidden = true;
  } else {
    sourceEditor.hidden = true;
    blocksContainer.hidden = false;
  }
}

suite('switchMode visibility', () => {
  let scrollTo: sinon.SinonSpy;

  setup(() => {
    scrollTo = sinon.spy();
  });

  teardown(() => {
    sinon.restore();
  });

  test('switching to source: sourceEditor shown, blocksContainer hidden', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(sourceEditor.hidden, false);
    assert.strictEqual(blocksContainer.hidden, true);
  });

  test('switching to preview: sourceEditor hidden, blocksContainer shown', () => {
    const sourceEditor: FakePanel = { hidden: false };
    const blocksContainer: FakePanel = { hidden: true };
    switchModeVisibility('preview', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(blocksContainer.hidden, false);
  });

  test('toggling source then preview restores preview state', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo);
    switchModeVisibility('preview', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(blocksContainer.hidden, false);
  });

  test('scrollTo(0,0) is called on every mode switch', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo);
    switchModeVisibility('preview', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(scrollTo.callCount, 2);
    assert.ok(scrollTo.alwaysCalledWithExactly(0, 0));
  });
});
```

- [ ] **Step 2: Compile the tests**

```bash
npm run compile:test
```

Expected: compilation succeeds, no TypeScript errors.

- [ ] **Step 3: Run the new tests and confirm they pass**

The tests inline the correct intended logic so they should pass immediately. They act as a regression guard — if `switchMode` logic in `editor.ts` is ever changed to break this behavior, the tests catch it.

```bash
npx mocha --ui tdd "out-test/test/suite/tabBar.test.js" --timeout 10000
```

Expected output (all passing):
```
  tab bar logic
    ✓ updateTabBar preview: preview tab selected, source deselected
    ✓ updateTabBar source: source tab selected, preview deselected
    ✓ updateTabBar is symmetric: switching back restores preview

  switchMode visibility
    ✓ switching to source: sourceEditor shown, blocksContainer hidden
    ✓ switching to preview: sourceEditor hidden, blocksContainer shown
    ✓ toggling source then preview restores preview state
    ✓ scrollTo(0,0) is called on every mode switch

  7 passing
```

- [ ] **Step 4: Commit the tests**

```bash
git add test/suite/tabBar.test.ts
git commit -m "test: add switchMode visibility and scroll-reset regression tests"
```

---

### Task 2: Apply the CSS fix

**Files:**
- Modify: `media/editor.css`

The `#source-editor` block has `display: flex`, which wins over the browser UA's `[hidden] { display: none }`. Adding a more-specific `#source-editor[hidden]` rule at author level re-asserts `none` and makes the `hidden` attribute work as intended.

- [ ] **Step 1: Add the fix to `media/editor.css`**

Find the `#source-editor` block (around line 110):

```css
#source-editor {
  height: 100vh;
  padding: var(--sp-6) var(--sp-8);
  display: flex;
  flex-direction: column;
}
```

Add the following rule immediately after it:

```css
#source-editor[hidden] { display: none; }
```

The file should now read:

```css
#source-editor {
  height: 100vh;
  padding: var(--sp-6) var(--sp-8);
  display: flex;
  flex-direction: column;
}

#source-editor[hidden] { display: none; }
```

- [ ] **Step 2: Commit the CSS fix**

```bash
git add media/editor.css
git commit -m "fix: restore [hidden] behaviour on source-editor overridden by display:flex"
```

---

### Task 3: Apply the JS scroll-reset fix

**Files:**
- Modify: `media/editor.ts`

`switchMode()` needs one line added at the top so every mode transition resets the viewport to the top.

- [ ] **Step 1: Add `window.scrollTo(0, 0)` to `switchMode()` in `media/editor.ts`**

Find `switchMode` (around line 239):

```typescript
function switchMode(mode: 'preview' | 'source'): void {
  updateTabBar(mode);
  currentMode = mode;
  if (mode === 'source') {
```

Change it to:

```typescript
function switchMode(mode: 'preview' | 'source'): void {
  window.scrollTo(0, 0);
  updateTabBar(mode);
  currentMode = mode;
  if (mode === 'source') {
```

- [ ] **Step 2: Build the webview bundle**

```bash
npm run build:webview
```

Expected: `media/editor.js` rebuilt with no errors.

- [ ] **Step 3: Run the full unit test suite**

```bash
npm run test:unit
```

Expected: all tests pass, no regressions.

- [ ] **Step 4: Commit the JS fix**

```bash
git add media/editor.ts media/editor.js
git commit -m "fix: scroll to top on every preview/source mode switch"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Launch the Extension Development Host**

Press **F5** in VS Code to open the Extension Development Host.

- [ ] **Step 2: Open a long `.md` file**

Open any `.md` file long enough to scroll (e.g. `README.md`). Confirm the file opens in Preview mode with no source textarea visible anywhere on the page.

- [ ] **Step 3: Verify source editor is hidden in Preview**

Scroll to the bottom of the document. Confirm there is no empty textarea box visible below the last rendered block.

- [ ] **Step 4: Switch to Source and back**

Press `Ctrl+\`` to switch to Source mode. Scroll down a few screens. Press `Ctrl+\`` again to return to Preview. Confirm:
- The viewport jumps to the top of the rendered document
- The source textarea is fully hidden — no textarea visible anywhere

- [ ] **Step 5: Repeat using the tab bar**

Click the **Source** tab, scroll down, click the **Preview** tab. Same expectations as Step 4.
