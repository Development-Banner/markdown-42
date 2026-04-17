# Changelog

All notable changes to Markdown42 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- **LCS-based block diff engine.** Replaces naive positional comparison with proper sequence alignment. The SCM diff view now highlights the correct `added`, `removed`, and `changed` blocks, with gap markers to keep corresponding sections visually aligned across panes.
- **Redesigned empty state.** Fresh `.md` files now greet you with an animated ghost-pen character, one of 100+ rotating one-liners, and three one-click templates: **Start writing**, **Basic structure**, **Table template**. `prefers-reduced-motion` respected. Read-only panels (diff view) show a stripped-down version without action buttons.
- **Diff-view scroll sync** between the original and modified panes.
- **`readOnly` flag** on `WebviewConfig` so the webview can adapt UX for diff/preview contexts.
- **`modeChange` host message** so the extension host can react to user-initiated mode switches.

### Changed
- Save button replaced with an always-visible sync indicator (spin while saving, check when saved).
- Toolbar CSS rebuilt around a segmented pill toggle + sync indicator.
- Stricter test requirement documented in `CLAUDE.md`: every change ships with tests.

## [0.1.1]

- Initial public preview.
- Click-to-edit per-block inline editor.
- GitHub-accurate rendering (markdown-it + GFM + emoji + task lists).
- Document outline tree view, scroll-synced.
- Copy button on fenced code blocks.
- Preview / Source toggle with `` Ctrl+` `` shortcut.
- Auto-save after every edit, configurable.
