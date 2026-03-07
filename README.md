<p align="center">
  <img src="media/icon.png" width="96" alt="Markdown42 icon" />
</p>

<h1 align="center">Markdown42</h1>

<p align="center">
  <strong>Typora-style inline editing · GitHub-accurate rendering · Smart outline · Zero split panes</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=markdown42.markdown42"><img src="https://img.shields.io/visual-studio-marketplace/v/markdown42.markdown42?color=0D1117&label=VS%20Code%20Marketplace&logo=visual-studio-code&logoColor=white&style=flat-square" alt="Marketplace" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square&color=0D1117" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/vscode-%5E1.85.0-blue?style=flat-square&color=0D1117&logo=visual-studio-code&logoColor=white" alt="VS Code Engine" />
</p>

---

## What is Markdown42?

Markdown42 replaces VS Code's default Markdown editor with a **live inline editor** — click any paragraph, heading, or list item and edit it directly, just like Typora or Notion. No side-by-side panels. No mental context switching. Your document always looks exactly as it will render.

---

## Features

| | |
|---|---|
| **Inline WYSIWYG editing** | Click any block to edit it in place. The rest of the document stays rendered. |
| **GitHub-accurate rendering** | Powered by `markdown-it` with task lists, emoji, and table support. |
| **Smart document outline** | Live heading tree in the Explorer sidebar. Scrolls in sync with your document. |
| **Toggle source view** | Press `Ctrl+\`` (or `Cmd+\`` on Mac) to see raw Markdown at any time. |
| **Auto-save** | Every edit is saved to disk automatically (Typora-style). Disable in settings if you prefer manual saves. |
| **Zero split panes** | One pane. One file. One focus. |

---

## Installation

1. Open VS Code
2. Press `Ctrl+P` and run:
   ```
   ext install markdown42.markdown42
   ```
3. Open any `.md` file — Markdown42 activates automatically.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+\`` / `Cmd+\`` | Toggle source / preview mode |
| `Ctrl+S` / `Cmd+S` | Save |
| Click any block | Enter inline edit mode |
| `Escape` | Commit edit and return to preview |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `markdown42.defaultMode` | `preview` | Open files in preview or source mode |
| `markdown42.fontSize` | `16` | Base font size (px) |
| `markdown42.lineWidth` | `860` | Max content width (px) |
| `markdown42.autoSave` | `true` | Save after every edit |
| `markdown42.syncScrollOutline` | `true` | Highlight active heading in outline |
| `markdown42.renderDelay` | `150` | Debounce delay before re-render (ms) |

---

## Tech Stack

- **VS Code Custom Editor API** — full document lifecycle control
- **markdown-it** — CommonMark + GitHub extensions
- **TypeScript** — end to end
- **esbuild** — fast webview bundling

---

## Contributing

```bash
git clone https://github.com/markdown42/markdown42-vscode
cd markdown42-vscode
npm install
npm run compile
npm run build:webview
# Press F5 in VS Code to launch the Extension Development Host
```

Run tests:
```bash
npm run test:unit
```

---

## License

[MIT](LICENSE) — built with love for everyone who just wants to write.
