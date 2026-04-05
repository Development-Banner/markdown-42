<div align="center">
  <br />
  <img src="media/icon.png" width="72" alt="Markdown42" />
  <br /><br />

  <h1>Markdown42</h1>

  <p>
    <strong>The writing experience VS Code was missing.<br/>
    Click any block to edit. Move away — it renders. One pane.</strong>
  </p>

  <p>
    <a href="https://marketplace.visualstudio.com/items?itemName=Shaf.markdown42">
      <img src="https://img.shields.io/visual-studio-marketplace/v/Shaf.markdown42?style=flat-square&color=0ea5e9&label=VS%20Marketplace&logo=visualstudiocode&logoColor=white" alt="Marketplace" />
    </a>
    &nbsp;
    <a href="https://marketplace.visualstudio.com/items?itemName=Shaf.markdown42">
      <img src="https://img.shields.io/visual-studio-marketplace/i/Shaf.markdown42?style=flat-square&color=6366f1&label=Installs" alt="Installs" />
    </a>
    &nbsp;
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="MIT License" />
    </a>
    &nbsp;
    <img src="https://img.shields.io/badge/VS%20Code-%5E1.85-f59e0b?style=flat-square&logo=visualstudiocode&logoColor=white" alt="VS Code requirement" />
  </p>

  <br />
</div>

---

## The problem with split-pane Markdown

Every time you write Markdown in VS Code, your attention is split across two panes. Left pane: `**this is bold**`. Right pane: **this is bold**. You're not writing — you're translating. Back and forth, perpetually.

Typora fixed this years ago. Your document renders as you type. Click a heading — it becomes a `#`. Click away — it renders again. One surface. Total focus.

**Markdown42 brings that exact experience into VS Code.** No new app to switch to, no workflow change, no compromise on your setup. Just open a `.md` file and start writing.

---

<img src="https://github.com/Development-Banner/markdown-42/raw/main/media/markdown42-preview.gif" alt="Markdown42 in action — click to edit, renders on focus-out" width="100%" />

---

## How it works

**Click any block to edit it.** Paragraphs, headings, lists, tables, blockquotes — everything is individually editable inline. The block you're editing shows raw Markdown. Everything else stays rendered.

**Press `Escape` (or click away) to commit.** The block snaps back to a clean rendered view. Your edits are written to disk instantly — no `Ctrl+S` required.

**Toggle Source mode anytime.** Press `Ctrl+\`` to see the full raw Markdown. Press it again to return to the live view. The tab bar at the top of every file lets you do the same with a click.

---

## Everything you need, nothing you don't

| | VS Code built-in | Markdown42 |
|---|:---:|:---:|
| Live rendered preview | Side pane only | ✅ Inline |
| Click-to-edit any block | ❌ | ✅ |
| Raw source access | ✅ | ✅ Source tab |
| Document outline | ❌ | ✅ Scroll-synced |
| Copy button on code blocks | ❌ | ✅ |
| GitHub-accurate rendering | ❌ | ✅ |
| Auto-save after edit | ❌ | ✅ |
| Task lists `- [ ]` | ❌ | ✅ |
| Emoji shortcodes `:tada:` | ❌ | ✅ |

---

## Features

### Click-to-edit, inline

No modals, no popups, no sidebars. Click any paragraph, heading, list item, table, or blockquote — it opens in-place as a textarea showing raw Markdown. Edit it. Press `Escape` or click elsewhere to render. The rest of your document never moves.

### GitHub-accurate rendering

Powered by `markdown-it` with full GFM support out of the box: tables, task lists, strikethrough, fenced code blocks with syntax hints, nested blockquotes, and emoji shortcodes like `:tada:` → 🎉. What you see is what GitHub will show.

### Document outline, live

A live heading tree appears in the Explorer sidebar whenever a Markdown42 file is active. Scroll through a long document — the active heading highlights automatically. Click any entry to jump directly to that section.

### Copy button on code blocks

Hover over any fenced code block. A **Copy** button appears in the top-right corner. Click it — the raw code (no fences, no language tag) lands in your clipboard. Confirmed with a brief "Copied!" label.

### Preview / Source toggle

A `[ Preview ] [ Source ]` tab bar sits at the top of every file. Switch with a click or with `Ctrl+\``. In Source mode you get the full raw Markdown document exactly as it's stored on disk. Toggle back to Preview to return to the inline editor.

### Auto-save

Every edit is written to disk the moment you commit a block. Completely transparent — no save dialogs, no unsaved-file indicators. If you prefer manual saves, disable it in settings and use `Ctrl+S`.

---

## Getting started

**Install from the VS Code Marketplace:**

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for **Markdown42**
4. Click Install

Any `.md` file you open will automatically use Markdown42. To open a file in the default VS Code text editor instead, right-click the file and choose **Open With → Text Editor**.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl+\`` / `Cmd+\`` | Toggle Preview ↔ Source |
| `Ctrl+S` / `Cmd+S` | Save (when auto-save is off) |
| Click any block | Enter inline edit mode |
| `Escape` | Commit edit, return to preview |

---

## Settings

Open VS Code settings (`Ctrl+,`) and search for **Markdown42** to configure:

| Setting | Default | Description |
|---|---|---|
| `markdown42.defaultMode` | `preview` | Open files in `preview` or `source` mode |
| `markdown42.autoSave` | `true` | Save automatically after every edit |
| `markdown42.fontSize` | `16` | Base font size in px |
| `markdown42.lineWidth` | `860` | Max content width in px |
| `markdown42.syncScrollOutline` | `true` | Highlight active heading in the outline as you scroll |
| `markdown42.renderDelay` | `150` | Debounce delay before re-rendering after a keystroke (ms) |

---

## Contributing & issues

Found a bug or have a feature request? [Open an issue](https://github.com/markdown42/markdown42-vscode/issues) — feedback shapes what gets built next.

---

<div align="center">
  <sub>MIT License — built for everyone who just wants to write.</sub>
</div>
