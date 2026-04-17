# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Compile extension host TypeScript (src/ → out/)
npm run compile

# Bundle webview TypeScript (media/ → media/editor.js)
npm run build:webview

# Watch modes (run in separate terminals during development)
npm run watch            # extension host
npm run watch:webview    # webview bundle

# Run unit tests (mocha, no VS Code instance needed)
npm run test:unit

# Run all tests (requires VS Code + Electron)
npm test

# Lint
npm run lint
npm run lint:fix

# Package for marketplace
npm run package
```

To debug: press **F5** in VS Code to launch the Extension Development Host.

## Architecture

This is a VS Code extension that replaces the default Markdown editor with a WYSIWYG inline editor (Typora-style). There are two distinct runtime contexts:

### Extension Host (Node.js) — `src/`

- **`extension.ts`** — Entry point. Registers the custom editor provider, the outline tree view, and all commands. Maintains a single `_activeModel` reference so the save command knows which document to save.
- **`editor/MarkscapeEditor.ts`** — Implements `vscode.CustomTextEditorProvider`. Builds the webview HTML with a nonce-based CSP, routes typed messages between host and webview via `MessageBus`, propagates external document changes, and manages lifecycle/disposal.
- **`editor/DocumentModel.ts`** — Single source of truth for document content. All writes go through `vscode.WorkspaceEdit` to preserve undo/redo. Tracks a monotonic `version` counter used to discard stale webview messages.
- **`editor/MessageBus.ts`** — Shared discriminated-union types for host↔webview messages (`HostToWebview`, `WebviewToHost`, `WebviewConfig`). Import this file in both contexts for type-safe messaging.
- **`outline/OutlineProvider.ts`** — `vscode.TreeDataProvider` for the Document Outline panel. Populated from `HeadingNode[]` sent by the webview.
- **`parser/markdownParser.ts`** — `markdown-it` instance (HTML disabled for XSS safety) with task lists, emoji, and a custom pre-processor that converts space-aligned plain-text tables to GFM pipe tables before rendering.
- **`parser/blockParser.ts`** — Splits markdown into discrete block-level units for the per-block rendering model.
- **`settings/config.ts`** — Reads `markdown42.*` workspace config; `toWebviewConfig()` projects it to `WebviewConfig` for the webview.

### Webview (browser sandbox) — `media/`

Bundled by esbuild into `media/editor.js` (IIFE, no Node.js APIs). The source files are TypeScript but compiled for the browser:

- **`editor.ts`** — Webview entry point. Handles all `window.addEventListener('message', …)` from the host, drives mode switching (preview ↔ source), debounced edit sends, link interception, keyboard shortcuts, scroll-sync, and the save button.
- **`renderer.ts`** — Renders markdown to DOM blocks. `renderAll()` for full re-renders; `renderUpdate()` for efficient single-block diffs.
- **`inlineEditor.ts`** — Manages the inline edit mode lifecycle: replaces a rendered block with a textarea, handles commit/cancel, and surfaces `onCommit`/`onCancel` callbacks to `editor.ts`.

### Key Design Constraints

- **Two build steps are required**: `npm run compile` (extension host) and `npm run build:webview` (webview bundle). Both must be run before testing.
- **Version guards**: Every edit message carries a `version` integer. The host ignores messages with a version older than the current `DocumentModel.version`; the webview ignores `update` messages older than `localVersion`. This prevents races during undo/redo and external file changes.
- **No inline HTML in markdown**: `markdown-it` is configured with `html: false` to prevent XSS when opening untrusted files.
- **Link security**: All links set `href="#"` and carry the real URL in `data-href`. The host validates the scheme (http/https/mailto only) before calling `vscode.env.openExternal`.
- **Webview CSP**: `default-src 'none'` with per-load random nonce. Do not weaken this policy.

### Tests

Unit tests live in `test/suite/` and use mocha + chai + sinon + jsdom. They compile to `out-test/` via `test/tsconfig.test.json` (which includes both `src/` and `media/inlineEditor.ts`). Test fixtures are in `test/fixtures/`.

```bash
# Run a single test file
npx mocha --ui tdd "out-test/test/suite/markdownParser.test.js" --timeout 10000
```

Coverage threshold: 80% lines/functions, 75% branches (enforced by nyc).

**Every change must include tests.** When adding or modifying code, write or update unit tests in the corresponding `test/suite/*.test.ts` file. Run `npm run test:unit` before considering any change complete. Do not skip tests even for "obvious" fixes — if it can break, it needs a test proving it works.
