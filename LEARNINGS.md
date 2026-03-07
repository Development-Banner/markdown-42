# Markdown42 — Engineering Learnings

Documented lessons from building a VS Code custom editor extension. Updated continuously.

---

## Architecture Decisions

### ADR-001: Two-Phase renderUpdate()

**Problem:** `renderUpdate()` called `requestAnimationFrame()` for all DOM work. Any code running
after `renderUpdate()` returned saw `_renderedBlocks` still at its old value because rAF hadn't
fired yet. This caused serialization to use stale block data.

**Solution:** Split into two explicit phases:
1. **Synchronous data phase** — diff old vs new blocks, build `newRendered[]`, assign
   `_renderedBlocks = newRendered` **before** any rAF.
2. **Deferred DOM phase** — rAF fires with a pre-computed `changedIndices[]` list and only
   performs `replaceChild`/`appendChild` writes.

**Result:** Callers can always read `_renderedBlocks` immediately after `renderUpdate()` returns.

---

### ADR-002: onCommit Must Not Pre-Mutate _renderedBlocks

**Problem:** `onCommit` was doing `_renderedBlocks[idx].raw = newRaw` before calling
`renderUpdate(newMarkdown)`. The diff inside `renderUpdate` saw no change and skipped re-rendering.

**Solution:** `onCommit` constructs `newMarkdown` via `.map((b, i) => i === idx ? newRaw : b.raw)`
**without** touching `_renderedBlocks`. `renderUpdate` performs the diff and updates
`_renderedBlocks` itself.

---

### ADR-003: inlineEditor Must Store Callbacks in Module State

**Problem:** `commitActiveEdit()` was looking up the block by `_activeBlockIndex` and calling
`enterEditMode`'s callbacks on the **new** block lookup — but by the time commit fires, the block
element may no longer exist or has been replaced.

**Solution:** Store `_activeCallbacks = { onCommit, onCancel }` in module-level state alongside
`_activeBlockIndex`. `commitActiveEdit()` uses `_activeCallbacks` directly, ignoring the DOM state.

---

### ADR-004: inlineEditor Must Hide All Block Children

**Problem:** `enterEditMode` used `block.querySelector(':not(textarea)')` to hide existing content.
`querySelector` returns exactly one element. If a block has multiple child elements (e.g. a `<ul>`
with multiple `<li>`), only the first was hidden. The rest remained visible alongside the textarea.

**Solution:** Iterate `Array.from(block.children)`, set `el.setAttribute('data-hiddenByEditor','1')`
and `el.style.display = 'none'` on each. Cleanup restores via `[data-hiddenByEditor]` selector.

---

### ADR-005: Space-Aligned Table Pre-Processing

**Problem:** Many real-world markdown docs use plain-text aligned tables (no `|` pipes). These
render as paragraphs of text + an `<hr>` for the dash-separator row. markdown-it only handles GFM
pipe tables.

**Solution:** `preprocessSpaceTables()` in `markdownParser.ts` runs before `md.render()`:
1. Detect separator line: `/^[-\s]+$/` with 2+ groups of 2+ dashes.
2. Infer column boundaries from left-edge positions of each dash group (`parseColumnStarts()`).
3. Convert header + data rows to GFM `| col | col |` format.
4. Escape `|` inside cell content with `escapeCell()`.

`blockParser.ts` also calls `isSpaceAlignedTable()` so blocks are typed as `'table'` correctly.

---

## Bug Log

### BUG-001: Edit Commit Didn't Update DOM

**Symptom:** After editing a block and blurring the textarea, the block re-displayed the old
rendered content instead of the new content.

**Root cause:** See ADR-001 and ADR-002.

**Fixed in:** `media/renderer.ts`, `media/editor.ts`

---

### BUG-002: inlineEditor Only Hid First Child Element

**Symptom:** When entering edit mode on a list block, only the first `<li>` disappeared; all
others remained visible under the textarea.

**Root cause:** See ADR-004.

**Fixed in:** `media/inlineEditor.ts`

---

### BUG-003: commitActiveEdit Used Wrong Callbacks

**Symptom:** Committing an edit on block N sometimes fired the commit handler for block N-1.

**Root cause:** See ADR-003.

**Fixed in:** `media/inlineEditor.ts`

---

### BUG-004: Space-Aligned Tables Rendered as Plain Text + HR

**Symptom:** Tables like `Name    Value\n------- -----\nFoo     Bar` rendered as a paragraph,
a horizontal rule, and another paragraph — not as a table.

**Root cause:** markdown-it has no awareness of space-aligned tables. The dash separator matched
its `<hr>` rule.

**Fixed in:** `src/parser/markdownParser.ts` (preprocessSpaceTables), `src/parser/blockParser.ts`

---

### BUG-005: HeadingTreeItem TypeScript Error (TS2415)

**Symptom:** `Property 'command' in type 'HeadingTreeItem' is not assignable to the same property
in base type 'TreeItem'. Types of property 'command' are incompatible.`

**Root cause:** `vscode.TreeItem` has `command?: vscode.Command` (optional). When a subclass
declares `command` as a constructor parameter and assigns it without the `?`, TypeScript infers a
non-optional type that is incompatible.

**Fix:** Renamed constructor parameter to `navCommand`, assigned with `if (navCommand) this.command = navCommand`.

**Fixed in:** `src/outline/OutlineProvider.ts`

---

### BUG-007: Textarea + Rendered Content Visible Simultaneously (BUG-002 Recurrence)

**Symptom:** When clicking any block to enter edit mode, the rendered HTML (e.g., a table) remains
visible ABOVE the textarea instead of being replaced by it. Both are on screen at the same time.

**Root causes (two, both fixed):**

1. **CSS gap**: The JS `display:none` hide logic could be beaten by a deferred `requestAnimationFrame`
   from a concurrent `renderUpdate` call. If the rAF fired after `enterEditMode` hid children but
   before the user saw the textarea, the block element was replaced by a new DOM node (with visible
   rendered content) and the textarea was lost with it.

2. **rAF replaces editing blocks**: `renderUpdate`'s rAF iterated all `changedIndices` and called
   `container.replaceChild(newEl, existingEl)` without checking whether `existingEl` was in edit
   mode. Replacing an editing block destroys the textarea and shows rendered content.

**Fixes:**

1. **CSS defensive rule** in `editor.css`:
   ```css
   .block.editing > *:not([data-editor-textarea]) {
     display: none !important;
   }
   ```
   Belt-and-suspenders guarantee: while a block has class `editing`, ONLY the textarea can be
   visible regardless of JS timing. The `!important` beats any render-triggered DOM update.

2. **renderUpdate guard** in `renderer.ts` rAF:
   ```typescript
   if (existingEl?.classList.contains('editing')) continue;
   ```
   Never replace a block the user is actively editing. The commit callback (`onCommit`) is
   responsible for triggering the re-render after cleanup.

**Test:** `test/suite/inlineEditor.test.ts` — 11 jsdom-based DOM-level tests covering child
hiding, textarea visibility, editing class, data attributes, and keyboard shortcuts.
`jsdom` is used to provide a browser-like DOM in the plain Mocha test runner (no Extension Host).

**Fixed in:** `media/editor.css`, `media/renderer.ts`

**BUG-008: Table header click shows both rendered HTML and textarea (BUG-007 recurrence)**

**Symptom:** Click table block → enters edit mode. Click the table's header row (or any heading
adjacent to the table). Both the rendered HTML table AND the raw markdown textarea are visible.

**Root cause:** The previous deferred rAF fix only applied when *switching* between edits
(`isEditing() && getActiveBlockIndex() !== blockIndex`). For the case where the user clicks a
block with NO prior active edit, `_activateEditMode` was called SYNCHRONOUSLY. If a
`renderUpdate` rAF was already queued at that moment (e.g. from an external document update, or
from a previous commit on the same frame), that rAF fires AFTER edit mode is entered. The rAF
may replace or duplicate the target block element (due to a block-count shift), leaving both the
rendered content and the textarea on screen.

**Fix:** `handleBlockClick` now ALWAYS defers `_activateEditMode` via `requestAnimationFrame`,
regardless of whether a previous edit was in progress. rAF callbacks fire in registration order,
so any pending re-render rAF fires first, the DOM settles, and only then does the edit mode entry
query and modify the correct element. Same-block re-clicks (table header click while table is in
edit mode) are fast-rejected before the rAF is queued.

**New tests** (`test/suite/inlineEditor.test.ts`): same-block re-click is a no-op; table child
is `display:none` immediately after `enterEditMode` on a table block.

**Fixed in:** `media/editor.ts`

**BUG-007 RECURRENCE (second fix):** The CSS + rAF-guard fix was not sufficient. The real root
cause is a **block-count change race** when switching edits:

1. User edits block A (types a blank line, splitting it into A1 + A2)
2. Clicks block B (table at index T)
3. `_commitActive()` → `_cleanup(A)` removes 'editing' from A → `renderUpdate` → rAF1 queued
4. `enterEditMode` immediately marks B as 'editing', hides B's children, adds textarea
5. rAF1 fires: block count is N+1, indices ≥ A's index shifted. rAF guard SKIPS replacing
   B (has 'editing'). BUT B's content in `newRendered` is now at a DIFFERENT index (T+1).
   rAF places a NEW rendered element for B's content at position T+1.
6. User sees: editing block at T (textarea + hidden rendered content) AND new rendered block
   at T+1 (table fully visible) — **content appears twice**

**Root fix** (`media/editor.ts` `handleBlockClick`): defer entering edit mode for B until
AFTER the re-render rAF has settled. `requestAnimationFrame` callbacks run in registration
order — since rAF1 (from `renderUpdate`) is queued first and rAF2 (our deferred edit entry)
is queued second, rAF2 always fires AFTER the DOM is up to date. At rAF2 time, we query
`[data-block-index="${blockIndex}"]` freshly, getting the correct element at its post-render
position.

`commitActiveEdit()` was exported from `inlineEditor.ts` to allow the deferred path to
commit-then-wait before entering the new edit mode.

---

### BUG-006: markdown-it-emoji v3 API Change

**Symptom:** `TypeError: plugin.apply is not a function` at startup.

**Root cause:** `markdown-it-emoji` v3 changed from a default export to named exports
`{ bare, full, light }`. The old `import emojiPlugin from 'markdown-it-emoji'` pulled in an object,
not a function.

**Fix:** `import * as emojiPlugin from 'markdown-it-emoji'` then `.use(emojiPlugin.full)`.

**Fixed in:** `src/parser/markdownParser.ts`, `src/types/plugins.d.ts`

---

## Platform Notes

### Windows Path Handling

Never use string concatenation for VS Code URIs. Always use `vscode.Uri.joinPath(uri, 'segment')`.
Direct `/`-concatenation fails on Windows when mixing URI schemes with disk paths.

---

## Test Infrastructure

### Why out-test/ (Not out/test/)

VS Code extension tests compile to `out/` by default. If tests go to `out/test/`, the `.vscodeignore`
pattern `out/test/**` must be ordered carefully relative to `!out/**/*.js`. Using a separate
`out-test/` directory sidesteps all glob ordering edge cases and keeps the `.vsix` clean.

### Stubbing vscode API in Unit Tests

`DocumentModel` calls `vscode.workspace.applyEdit`. In unit tests running outside the Extension Host,
this fails. The pattern is: import the real `vscode` module but replace methods with `sinon.stub()`
before the module under test runs. Since Node.js caches modules, the stub is seen by the module.

```typescript
import * as vscode from 'vscode';
// Before each test:
stub = sinon.stub(vscode.workspace, 'applyEdit').resolves(true);
```

### Mocha TDD UI

The test runner uses `--ui tdd`. Test files must use `suite()` / `test()` (not `describe()` / `it()`).
Mixing BDD and TDD syntax causes silent test discovery failures.
