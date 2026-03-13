<!-- <p align="center">
  <img src="media/icon.png" width="96" alt="Markdown42 icon" />
</p> -->

<h1 align="center">Markdown42</h1>

<p align="center">
  <strong>A Typora-style live Markdown editor for VS Code — no split panes, just your document.</strong>
</p>

<!-- <p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=markdown42.markdown42"><img src="https://img.shields.io/visual-studio-marketplace/v/markdown42.markdown42?color=0D1117&label=Marketplace&logo=visual-studio-code&logoColor=white&style=flat-square" alt="Marketplace version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=markdown42.markdown42"><img src="https://img.shields.io/visual-studio-marketplace/i/markdown42.markdown42?color=0D1117&label=Installs&style=flat-square" alt="Installs" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=markdown42.markdown42"><img src="https://img.shields.io/visual-studio-marketplace/r/markdown42.markdown42?color=0D1117&label=Rating&style=flat-square" alt="Rating" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square&color=0D1117" alt="MIT License" /></a>
</p> -->

---

<img src="/media/preview-mardown42.gif" alt="toggle bold gif" width="100%">
---

## Why Markdown42?

VS Code's built-in Markdown support requires a **split pane** — one pane to type raw syntax, another to preview. Markdown42 eliminates that entirely.

| | VS Code built-in | Markdown42 |
|---|---|---|
| Edit raw Markdown | ✅ | ✅ (Source tab) |
| Live rendered preview | Side pane only | ✅ Inline, always |
| Click to edit any block | ❌ | ✅ |
| Document outline | ❌ | ✅ Live, scroll-synced |
| Copy button on code blocks | ❌ | ✅ |
| Auto-save | ❌ | ✅ |

---

## Features

### Inline WYSIWYG editing
Click any paragraph, heading, list, table, or blockquote to edit it in place. The rest of the document stays rendered. Press `Escape` to commit and return to preview.

<!-- Screenshot: clicking a heading block to edit it inline -->

### Preview / Source tab bar
A `[ Preview ] [ Source ]` tab bar lives at the top of every file. Switch modes with a click or with `Ctrl+\`` — the tab stays in sync either way.

<!-- Screenshot: tab bar with Source tab active showing raw Markdown -->

### Copy button on code blocks
Hover over any fenced code block to reveal a **Copy** button in the top-right corner. Click it — "Copied!" confirms the raw code is in your clipboard (no fences, no language tag).

<!-- Screenshot: code block hovered with Copy button visible -->

### GitHub-accurate rendering
Powered by `markdown-it` with full GFM support: task lists (`- [ ]`), tables, strikethrough, emoji (`:tada:`), and nested blockquotes.

### Smart document outline
A live heading tree appears in the Explorer sidebar whenever a Markdown42 file is active. It scrolls in sync with your document as you read.

### Auto-save
Every inline edit is written to disk automatically (Typora-style). Disable in settings if you prefer `Ctrl+S`.

---

## Installation

**Via Quick Open** (recommended):

```
ext install markdown42.markdown42
```

**Via Command Palette:** `Ctrl+Shift+P` → `Extensions: Install Extensions` → search `Markdown42`

Once installed, open any `.md` file — Markdown42 activates automatically as the default editor.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+\`` / `Cmd+\`` | Toggle Preview ↔ Source |
| `Ctrl+S` / `Cmd+S` | Save |
| Click any block | Enter inline edit mode |
| `Escape` | Commit edit, return to preview |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `markdown42.defaultMode` | `preview` | Open files in `preview` or `source` mode |
| `markdown42.fontSize` | `16` | Base font size in px |
| `markdown42.lineWidth` | `860` | Max content width in px |
| `markdown42.autoSave` | `true` | Save automatically after every edit |
| `markdown42.syncScrollOutline` | `true` | Highlight active heading in Explorer outline |
| `markdown42.renderDelay` | `150` | Debounce delay before re-render (ms) |

---

## Contributing

```bash
git clone https://github.com/markdown42/markdown42-vscode
cd markdown42-vscode
npm install
npm run compile && npm run build:webview
# Press F5 in VS Code to launch the Extension Development Host
```

Run unit tests:

```bash
npm run test:unit
```

---

## License

[MIT](LICENSE) — built with love for everyone who just wants to write.
