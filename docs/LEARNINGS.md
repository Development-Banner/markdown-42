# Markdown42 — Engineering Learnings

> Living document. Updated as we discover, break, and fix things.

---

## Architecture Decisions

### Why esbuild for the webview, tsc for the host
The extension host (Node.js) is compiled with `tsc` directly. The webview code (`media/`) must be bundled for the browser sandbox — it imports from `src/parser/` which in turn imports `markdown-it` etc. esbuild handles this cross-boundary bundling in ~100ms vs webpack's 3-5s.

**Files:**
- Extension host: `src/` → `out/` (via `tsconfig.json`)
- Webview: `media/editor.ts` → `media/editor.js` (via `esbuild.config.js`)
- Tests: `test/` → `out-test/` (via `test/tsconfig.test.json`)

### Why separate `out-test/` for test compilation
Early versions compiled tests into `out/test/`. The `.vscodeignore` patterns (`out/test/**`) didn't reliably exclude these from the `.vsix` because the glob order conflicted with `!out/**/*.js` keep rules. Changing `outDir` to `../out-test` (outside `out/`) made exclusion trivial and clean.

---

## Bug Log

### BUG-001 — Edit commit didn't update the DOM
**Symptom:** Changing text and clicking outside had no visible effect. Old content remained.

**Root cause (two interacting bugs):**

1. `renderUpdate()` in `renderer.ts` built `newRendered[]` inside `requestAnimationFrame`. Then set `_renderedBlocks = newRendered` synchronously — but `newRendered` was still `[]` at that point (the rAF hadn't fired yet). Any code running after `renderUpdate()` saw an empty block list.

2. `onCommit` in `editor.ts` pre-mutated `_renderedBlocks[idx].raw = newRaw` BEFORE calling `renderUpdate`. So when `renderUpdate` diffed old vs new, `oldBlocks[idx].raw === newBlocks[idx].raw` — identical — so no DOM update was triggered.

**Fix:**
- Moved all data computation (diffing, building `newRendered`) OUTSIDE `requestAnimationFrame` in `renderUpdate`. Only DOM writes (replaceChild, appendChild) remain inside rAF. `_renderedBlocks` is now set synchronously to the fully-computed array.
- `onCommit` no longer pre-mutates `_renderedBlocks`. Instead builds `newMarkdown` by replacing only the edited block's raw content, then passes it to `renderUpdate` which detects the diff and re-renders.

**Files:** `media/renderer.ts`, `media/editor.ts`

---

### BUG-002 — `querySelector(':not(textarea)')` only hid first child
**Symptom:** When editing a block with multiple HTML children (e.g. a paragraph containing `<p>` + `<ul>`), only the first element was hidden. The remaining children overlapped the textarea.

**Root cause:** `blockEl.querySelector(':not(textarea)')` returns only the first matching element.

**Fix:** Iterate ALL children and hide every one that isn't the textarea, using a `data-hiddenByEditor` marker to reliably restore them on cleanup.

**Files:** `media/inlineEditor.ts`

---

### BUG-003 — `commitActiveEdit` used wrong callbacks
**Symptom:** When clicking a second block while editing the first, the first block's commit used the second block's callbacks (passed by reference). While this worked by coincidence (callbacks are index-based), it was fragile.

**Fix:** Store `_activeCallbacks` in module state alongside `_activeBlockIndex`. `_commitActive()` now always uses the stored callbacks from the block that was actually opened.

**Files:** `media/inlineEditor.ts`

---

### BUG-004 — Heading blocks had invisible click zones
**Symptom:** Clicking on heading text sometimes didn't register, especially near the top of the heading.

**Root cause:** The CSS rule `h1, h2, h3, h4, h5, h6 { margin-top: 1.5em }` applied inside `.block` divs. The heading's top margin created dead space at the top of the block that the click handler wasn't catching consistently across browsers.

**Fix:**
- Added `.block > h1, .block > h2 ... { margin-top: 0; margin-bottom: 0; }` to reset heading margins when they're the content of a block.
- Added `min-height: 2em` to `.block` to guarantee a minimum click target.
- The block hover now shows a subtle `✎` hint icon so users know blocks are editable.

**Files:** `media/editor.css`

---

### BUG-005 — npm security vulnerabilities on install
**Discovered on:** Initial setup

**Packages fixed:**
- `markdown-it 14.1.0` → `14.1.1` (ReDoS fix)
- `esbuild 0.24.2` → `0.27.3` (dev server exposure — not used but updated anyway)
- `playwright 1.50.1` → `1.58.2` (SSL cert verification)
- `sinon 19.0.2` → `21.0.2` (transitive `diff` DoS)

**Remaining (accepted):**
- `serialize-javascript ≤7.0.2` via `mocha 10.x` — no patched version exists. Only affects devDependencies (never shipped in `.vsix`). Attack requires controlling serialized test data. Risk: negligible in controlled CI environment.

---

### BUG-006 — `markdown-it-emoji` v3 API changed
**Symptom:** `TypeError: plugin.apply is not a function` on extension activation.

**Root cause:** `markdown-it-emoji` v3 changed from default export to named exports `{ bare, full, light }`. Old code: `.use(emoji)`. New API: `.use(emojiPlugin.full)`.

**Fix:** Updated import to `import * as emojiPlugin from 'markdown-it-emoji'` and use `.use(emojiPlugin.full)`. Added declaration file `src/types/plugins.d.ts` since `@types/markdown-it-emoji` doesn't exist.

**Files:** `src/parser/markdownParser.ts`, `src/types/plugins.d.ts`

---

## Platform Notes

### Windows vs macOS paths
- Always use `vscode.Uri.joinPath(context.extensionUri, ...)` — never string concatenation
- Webview URIs use forward slashes regardless of OS — VS Code handles this via `webview.asWebviewUri()`
- CI matrix: `windows-latest`, `macos-latest`, `ubuntu-latest` — all tested

### VS Code webview CSP
- Every webview instance gets a **fresh cryptographically random nonce** (`crypto.randomBytes(16).toString('hex')`)
- `default-src 'none'` — everything must be explicitly whitelisted
- External fonts blocked by CSP → using system fonts only: `'Cascadia Code'` (ships with VS Code), `'Segoe UI Variable'` (Windows), `-apple-system` (macOS)
- External images allowed via `img-src https: data:` — needed for markdown image links

### Node.js version
- Node v24 is installed (newer than the plan's target of v20)
- `@types/node` pinned to `20.17.x` — compatible with v24 runtime

---

## Test Architecture

Unit tests run without a VS Code Extension Development Host — they test pure TypeScript logic (parser, block splitter, outline data). The `vscode` module is stubbed manually in `documentModel.test.ts`.

Integration and E2E tests (requiring the Extension Development Host) are scaffolded but not yet wired up. `test/e2e/` is a placeholder for Playwright webview tests.

**Test paths:**
```
test/suite/*.test.ts  →  out-test/test/suite/*.test.js  →  mocha --ui tdd
```

Coverage gate: ≥80% lines/functions, ≥75% branches (enforced in CI).

---

## Design System Notes

The CSS uses **zero hardcoded hex colors**. Every color comes from `var(--vscode-*)` tokens, with accent layers using `color-mix(in srgb, ...)` to derive transparent variants. This ensures compatibility with all VS Code themes (dark, light, high-contrast).

Custom fonts used (system-only, no external requests):
- Headings: `'Cascadia Code'` (monospace, ships with VS Code)
- Body: `'Segoe UI Variable'` / `-apple-system` / `system-ui`
- Code: `var(--vscode-editor-font-family)` (user's configured editor font)
