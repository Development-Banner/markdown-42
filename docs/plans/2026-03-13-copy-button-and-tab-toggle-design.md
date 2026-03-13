# Copy Button & Tab Toggle — Design

**Date:** 2026-03-13
**Status:** Approved

---

## Features

1. **Copy button** — a copy-to-clipboard button on every rendered fenced code block (code block level)
2. **Tab bar toggle** — a `[ Preview ] [ Source ]` tab bar at the top of the webview for switching the entire file between modes (file level)

---

## Decisions

- Both features live entirely in the webview layer (`media/`) — no new host↔webview messages required
- Preview is always the default mode — aligns with the core extension philosophy
- `markdown42.defaultMode` setting still respected — if set to `"source"`, Source tab starts active
- Approach: Option A for both — inject at render time / in HTML structure

---

## Feature 1: Copy Button (code block level)

### Architecture

`renderer.ts` wraps each fenced code block in a container and injects a copy button at render time:

```html
<div class="code-block">
  <button class="copy-btn">Copy</button>
  <pre><code class="language-typescript">...</code></pre>
</div>
```

### Data Flow

1. `renderBlock()` in `renderer.ts` detects fenced code blocks and wraps them with `.code-block` + `.copy-btn`
2. Click handler reads `pre.querySelector('code').textContent`
3. Calls `navigator.clipboard.writeText(text)`
4. On success: button label → `Copied!` for 1.5s, then reverts to `Copy`
5. On failure: button label → `Failed` for 1.5s, then reverts to `Copy`

### Styling (`editor.css`)

- Button positioned top-right of the code block
- Hidden by default, visible on hover (opacity transition)
- Does not obstruct code content

### Error Handling

If `navigator.clipboard.writeText()` rejects (clipboard permission denied in webview sandbox), button shows `Failed` briefly — no crash, no console noise.

---

## Feature 2: Tab Bar Toggle (file level)

### Architecture

`buildHtml()` in `MarkscapeEditor.ts` adds a tab bar above `#content-wrapper`:

```html
<div id="tab-bar" role="tablist">
  <button role="tab" aria-selected="true"  data-mode="preview">Preview</button>
  <button role="tab" aria-selected="false" data-mode="source">Source</button>
</div>
```

### Data Flow

1. `editor.ts` `initTabBar()` called on boot — wires click handlers on both tab buttons
2. Each click calls existing `switchMode(mode)` function
3. `switchMode()` updated to also call `updateTabBar(mode)` — sets `aria-selected` and active CSS class on the correct tab
4. `Ctrl+\`` keyboard shortcut already calls `switchMode()` — tab bar stays in sync automatically at no extra cost

### Default State

- Preview tab active on load (default)
- If `markdown42.defaultMode` config is `"source"`, Source tab starts active

### Accessibility

- `role="tablist"` on container, `role="tab"` on each button
- `aria-selected` updated on every mode switch

---

## Testing

**Copy button** (`test/suite/renderer.test.ts` — new or extend):
- Assert fenced code block produces `.code-block` wrapper with `.copy-btn` + `<pre><code>`
- Mock `navigator.clipboard.writeText` with sinon — assert called with correct raw code text
- Assert label → `Copied!` after success, reverts after 1.5s (sinon fake timers)
- Assert label → `Failed` when clipboard rejects

**Tab bar** (`test/suite/editor.test.ts` — new or extend):
- Assert tab bar contains two buttons with correct labels
- Assert clicking Source tab calls `switchMode('source')` and sets correct `aria-selected`
- Assert clicking Preview tab calls `switchMode('preview')`
- Assert `updateTabBar` keeps tab in sync when mode switched via keyboard shortcut

Test framework: mocha (TDD interface).

---

## Files Touched

| File | Change |
|------|--------|
| `media/renderer.ts` | Wrap code blocks, inject copy button, attach click handler |
| `media/editor.ts` | Add `initTabBar()`, `updateTabBar(mode)`, update `switchMode()` |
| `media/editor.css` | Copy button styles, tab bar styles |
| `src/editor/MarkscapeEditor.ts` | Add tab bar HTML to `buildHtml()` |
| `test/suite/renderer.test.ts` | New/extended tests for copy button |
| `test/suite/editor.test.ts` | New/extended tests for tab bar |

---

## Out of Scope

- Per-block source toggle (toggle is file-level only)
- Syntax highlighting of code blocks
- Line numbers in code blocks
