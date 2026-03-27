# Design: Preview/Source Mode Switch Fix

**Date:** 2026-03-27
**Status:** Approved

## Problem

Two bugs affect mode switching between Preview and Source:

1. The `#source-editor` div has `display: flex` in author CSS, which overrides the browser UA stylesheet's `[hidden] { display: none }`. Setting `sourceEditor.hidden = true` in JS has no effect — the source textarea remains visible in Preview mode at all times.

2. When switching Source → Preview, `window.scrollTo` is never called, so the scroll position stays wherever it was in the source textarea. The rendered preview content is at the top of the page but the user is already scrolled past it.

## Changes

### 1. `media/editor.css`

Add one CSS rule immediately after the `#source-editor` block:

```css
#source-editor[hidden] { display: none; }
```

This re-asserts `display: none` at author specificity, making the `hidden` attribute work as intended.

### 2. `media/editor.ts` — `switchMode()`

Add `window.scrollTo(0, 0)` at the start of `switchMode()` so every mode transition resets to the top of the content area.

## Scope

- `media/editor.css` — one rule added
- `media/editor.ts` — one line added in `switchMode()`
- No changes to extension host code, HTML template, or other files

## Tests

- Unit test: `switchMode('source')` sets `sourceEditor.hidden = false` and `blocksContainer.hidden = true`
- Unit test: `switchMode('preview')` sets `sourceEditor.hidden = true` and `blocksContainer.hidden = false`
- Verify `window.scrollTo(0, 0)` is called on each mode switch
