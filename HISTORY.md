# Markdown42 — Version History

---

## [0.1.0] — 2026-03-07 — Initial MVP

### Added
- **Custom editor** (`markdown42.editor`) — replaces VS Code's default `.md` handler with a
  webview-based preview+edit experience. No split pane required.
- **Block-level editing** — click any paragraph, heading, list, or code block to enter inline
  edit mode. Textarea appears in-place with raw markdown. Blur to commit, `Escape` to cancel,
  `Ctrl+Enter`/`Cmd+Enter` to save immediately.
- **Incremental DOM diffing** — `renderUpdate()` compares old vs new blocks by raw content.
  Only changed blocks get a DOM update; unchanged blocks keep their existing elements.
- **GFM rendering** via `markdown-it 14.1.1`:
  - Task lists (`- [x]` / `- [ ]`)
  - Emoji shortcodes (`:wave:`, `:rocket:`, etc.) via `markdown-it-emoji` full set
  - Tables, strikethrough, autolinks, typographer
- **Space-aligned table pre-processor** — converts plain-text aligned tables (no `|` pipes) to
  GFM pipe tables before rendering. Handles 2-, 3-, and 4-column layouts found in real-world
  READMEs, changelogs, and wiki exports.
- **Document Outline** panel in the Explorer sidebar — auto-populated from headings, clickable
  to scroll.
- **Toggle source view** — `Ctrl+\`` (Windows/Linux) / `Cmd+\`` (macOS) switches between
  rendered preview and raw markdown editor.
- **External link interception** — all `<a>` clicks go via `vscode.env.openExternal`. Webview
  never navigates itself.
- **XSS protection** — `html: false` in markdown-it strips raw HTML from untrusted `.md` files.
  Link hrefs validated against `http/https/mailto` allowlist before calling `openExternal`.
- **Nonce-based CSP** — fresh `crypto.randomBytes(16)` nonce per webview instance.
  `default-src 'none'`.
- **Undo/redo safety** — all edits go through `vscode.workspace.applyEdit` (WorkspaceEdit API),
  never direct buffer mutation. VS Code's undo stack stays intact.
- **Version guard** — webview messages carry a monotonic `version` counter. Stale updates from
  undo/redo races are discarded.
- **Settings:**
  - `markdown42.defaultMode` — preview or source on open
  - `markdown42.fontSize` — base prose font size (10–32px)
  - `markdown42.lineWidth` — max content width (400–1800px)
  - `markdown42.syncScrollOutline` — highlight current heading as you scroll
  - `markdown42.renderDelay` — debounce delay in ms (50–1000ms)
  - `markdown42.enableTelemetry` — opt-in anonymous telemetry (default: off)

### Design System — "Obsidian Terminal"
- Monospace headings (`Cascadia Code`) with gradient shimmer on H1
- Zero hardcoded colors — 100% `var(--vscode-*)` tokens
- `color-mix(in srgb, ...)` for transparent accent layers
- Staggered block reveal animation on initial load
- Custom task list checkboxes, terminal chrome bar on code blocks
- Thin accent left-border on hover/edit states

### Security
- Supply chain: all dependencies pinned with exact versions
- `npm audit` gate in CI (high-severity threshold)
- Known accepted risk: `serialize-javascript` vulnerability in `mocha` devDependency —
  no patch available, zero runtime exposure (devDep only)

### Testing
- 80+ unit tests across: `markdownParser`, `blockParser`, `documentModel`, `outlineProvider`
- Performance test: 10K-line render < 500ms
- Security tests: XSS vectors, javascript: URIs, HTML injection
- Space-aligned table pre-processor tests: conversion, HTML output, edge cases

### Platform Support
- VS Code `^1.85.0`
- Windows 10/11 ✓
- macOS 12+ ✓
- Linux (Ubuntu 20.04+) ✓ (CI verified)

### Known Limitations (v0.2.0 roadmap)
- Table editor is raw markdown textarea (no visual table editor)
- No image drag-and-drop
- No syntax highlighting inside the inline edit textarea
- E2E Playwright tests scaffolded but not yet implemented

---

## Planned

### [0.2.0] — Editor UX
- Syntax highlighting in inline edit textarea (CodeMirror 6 micro-instance)
- Visual table editor on double-click
- Image paste / drag-and-drop support
- Heading anchor links (#id navigation)

### [0.3.0] — Performance
- Virtual/windowed rendering for documents > 1000 blocks
- Incremental parsing (only re-parse changed blocks, not full document)
- Web Worker for markdown-it render (off main thread)

### [1.0.0] — Publish-ready
- Publisher verification on VS Code Marketplace
- Extension telemetry dashboard
- CHANGELOG.md auto-generation from git history
- Localization (i18n) framework

### [2.0.0] — AI Features
- AI writing assistant (Claude API integration)
- Smart outline with semantic clustering
- Document health score (readability, structure)
