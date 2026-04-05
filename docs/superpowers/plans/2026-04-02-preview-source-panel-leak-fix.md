# Preview Source Panel Leak Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the blank Source panel that remains visible in Preview mode on first load and after returning from Source mode.

**Architecture:** Keep the existing webview structure and harden the Preview/Source visibility contract instead of refactoring the editor. The fix is split between `media/modeHelpers.ts` for authoritative state transitions, `media/editor.css` for a defensive `[hidden]` override that always wins, and regression tests that lock in the intended initial and toggled states.

**Tech Stack:** TypeScript, CSS, esbuild webview bundle, Mocha + assert + sinon

---

### Task 1: Lock down the visibility contract with tests

**Files:**
- Modify: `test/suite/modeHelpers.test.ts`
- Modify: `test/suite/markscapeEditor.test.ts`
- Test: `test/suite/modeHelpers.test.ts`
- Test: `test/suite/markscapeEditor.test.ts`

- [ ] **Step 1: Add an explicit container-level Preview regression test in `test/suite/modeHelpers.test.ts`**

Open `test/suite/modeHelpers.test.ts` and insert the following test after the existing `applyModeVisibility fully hides the source editor when returning to preview` test:

```typescript
  test('applyModeVisibility preview keeps the entire source subtree hidden', () => {
    const sourceEditor = makeSourceEditor(false);
    const blocksContainer: FakePanel = { hidden: true, dataset: {} };
    const sourceTextarea: FakePanel = {
      hidden: false,
      dataset: {},
      style: { display: 'block' },
    };

    applyModeVisibility('preview', sourceEditor, blocksContainer, sourceTextarea as {
      hidden: boolean;
      style: { display: string };
    });

    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(sourceEditor.style.display, 'none');
    assert.strictEqual(sourceTextarea.hidden, true);
    assert.strictEqual(sourceTextarea.style?.display, 'none');
    assert.strictEqual(blocksContainer.hidden, false);
    assert.ok(sourceEditor.classList.remove.calledOnceWithExactly('source-visible'));
  });
```

This duplicates part of the existing preview test on purpose so the plan explicitly guards the exact user symptom: the whole Source subtree must stay hidden when Preview is active.

- [ ] **Step 2: Add an initial-HTML regression test in `test/suite/markscapeEditor.test.ts`**

Open `test/suite/markscapeEditor.test.ts` and append the following test after `source editor panel starts hidden in the initial HTML`:

```typescript
  test('initial HTML nests the source textarea inside the hidden source editor container', () => {
    const html = buildTabBarHtml();
    assert.ok(
      html.includes('<div id="source-editor" aria-label="Source editor" hidden>') &&
      html.includes('<textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"></textarea>'),
      html
    );
  });
```

This keeps the initial DOM contract visible in tests: the textarea must live inside the hidden container, not outside it.

- [ ] **Step 3: Compile the test suite**

Run:

```bash
npm run compile:test
```

Expected: TypeScript completes without errors and updates `out-test/`.

- [ ] **Step 4: Run the targeted visibility tests**

Run:

```bash
npx mocha --ui tdd "out-test/test/suite/modeHelpers.test.js" "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
```

Expected: all tests pass, including the new Preview/container visibility checks.

- [ ] **Step 5: Commit the regression tests**

Run:

```bash
git add test/suite/modeHelpers.test.ts test/suite/markscapeEditor.test.ts
git commit -m "test: add preview source panel visibility regressions"
```

---

### Task 2: Harden Source container hiding in CSS

**Files:**
- Modify: `media/editor.css`
- Test: `test/suite/modeHelpers.test.ts`

- [ ] **Step 1: Add a non-negotiable `[hidden]` rule for the Source container**

Open `media/editor.css` and update the Source editor section so it contains this exact block:

```css
#source-editor {
  display: none; /* hidden by default; JS adds .source-visible to show */
  height: 100vh;
  padding: var(--sp-6) var(--sp-8);
  flex-direction: column;
  overflow: hidden;
}

#source-editor[hidden] {
  display: none !important;
}

#source-editor.source-visible {
  display: flex;
}
```

The `!important` is intentional here because this bug class is specifically about author-level `display` rules reintroducing layout participation while the container is marked hidden.

- [ ] **Step 2: Build the webview bundle**

Run:

```bash
npm run build:webview
```

Expected: esbuild completes successfully and rewrites `media/editor.js`.

- [ ] **Step 3: Commit the CSS hardening**

Run:

```bash
git add media/editor.css media/editor.js media/editor.js.map
git commit -m "fix: force-hide source panel when preview is active"
```

---

### Task 3: Keep Preview boot and mode transitions authoritative

**Files:**
- Modify: `media/modeHelpers.ts`
- Modify: `media/editor.ts`
- Test: `test/suite/modeHelpers.test.ts`

- [ ] **Step 1: Keep `applyModeVisibility()` container-first in `media/modeHelpers.ts`**

Open `media/modeHelpers.ts` and make sure `applyModeVisibility()` uses this exact implementation:

```typescript
export function applyModeVisibility(
  mode: EditorMode,
  sourceEditor: SourceEditorLike,
  blocksContainer: BlocksContainerLike,
  sourceTextarea: SourceTextareaLike
): void {
  const showSource = mode === 'source';

  sourceEditor.hidden = !showSource;
  sourceEditor.style.display = showSource ? 'flex' : 'none';
  sourceTextarea.hidden = !showSource;
  sourceTextarea.style.display = showSource ? 'block' : 'none';

  if (showSource) {
    sourceEditor.classList.add('source-visible');
  } else {
    sourceEditor.classList.remove('source-visible');
  }

  blocksContainer.hidden = showSource;
}
```

If the file already matches this shape, leave the logic intact and only make the minimal edits needed to preserve this exact contract.

- [ ] **Step 2: Preserve Preview-first boot ordering in `media/editor.ts`**

Open `media/editor.ts` and confirm the boot sequence at the bottom of the file remains:

```typescript
initTabBar();
applyModeVisibility('preview', sourceEditor, blocksContainer, sourceTextarea);
updateEmptyState('', blocksContainer);
vscode.postMessage({ type: 'ready' });
```

If the ordering has drifted, restore it exactly so Preview visibility is applied before the host sends content.

- [ ] **Step 3: Rebuild the webview after any TypeScript change**

Run:

```bash
npm run build:webview
```

Expected: esbuild succeeds and refreshes the bundled webview assets.

- [ ] **Step 4: Re-run the targeted visibility tests**

Run:

```bash
npm run compile:test
npx mocha --ui tdd "out-test/test/suite/modeHelpers.test.js" "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
```

Expected: all targeted tests still pass after the implementation changes.

- [ ] **Step 5: Commit the mode-visibility implementation**

Run:

```bash
git add media/modeHelpers.ts media/editor.ts media/editor.js media/editor.js.map
git commit -m "fix: keep preview and source root states mutually exclusive"
```

---

### Task 4: Run full verification and manual smoke checks

**Files:**
- Verify only: `media/editor.css`
- Verify only: `media/modeHelpers.ts`
- Verify only: `media/editor.ts`
- Verify only: `test/suite/modeHelpers.test.ts`
- Verify only: `test/suite/markscapeEditor.test.ts`

- [ ] **Step 1: Run the full unit suite**

Run:

```bash
npm run test:unit
```

Expected: all unit tests pass with no regressions.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: ESLint exits cleanly.

- [ ] **Step 3: Manually verify the bug in the Extension Development Host**

Press `F5` in VS Code, then open a markdown file in Markdown42 Preview mode and confirm:

```text
1. On first load, there is no blank panel visible at the bottom of the preview.
2. Switching Preview -> Source shows the full source textarea.
3. Switching Source -> Preview removes the source panel completely.
4. Returning to Preview does not leave raw markdown visible anywhere in the document flow.
```

- [ ] **Step 4: Commit any final verification-driven adjustments**

If manual verification required no code changes, skip this step. If a tiny follow-up change was needed, run:

```bash
git add <changed-files>
git commit -m "fix: polish preview source visibility cleanup"
```

## Self-Review

- Spec coverage: the plan covers the CSS guarantee, the mode-helper visibility contract, the Preview-first boot order, and regression tests for initial and toggled states.
- Placeholder scan: all file paths, commands, and code snippets are concrete.
- Type consistency: `applyModeVisibility`, `sourceEditor`, `sourceTextarea`, `blocksContainer`, and the existing test helper types match the current codebase names.
