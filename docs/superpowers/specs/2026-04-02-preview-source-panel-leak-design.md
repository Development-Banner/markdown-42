# Design: Preview Source Panel Leak Fix

**Date:** 2026-04-02
**Status:** Approved

## Problem

A residual mode-visibility bug remains in the webview:

1. In Preview mode, a blank panel is still visible near the bottom of the page before the user interacts with the editor.
2. After the user switches from Preview to Source and back to Preview, that same visible panel begins showing the raw markdown source.

The observed behavior indicates that the Source editor subtree is still participating in layout while Preview is active. The issue is distinct from the inline block editor flow because the panel is present on first load, before any block click.

## Context

Recent fixes already addressed related mode-switch issues:

- `#source-editor[hidden]` support was restored after author CSS overrode the browser's default `[hidden]` behavior.
- Mode selection was gated to first load so edit echoes do not reset the user's chosen mode.
- The Source/Preview toggle moved toward class-based visibility control.

This spec covers the remaining gap: Preview must fully suppress the Source panel's layout presence on initial load and after all mode transitions.

## Goal

Make Preview and Source mutually exclusive root states in the webview so the Source panel cannot reserve space or become visible while Preview is active.

## Proposed Changes

### 1. Strengthen the visibility contract in `media/modeHelpers.ts`

`applyModeVisibility()` remains the single authority for Source/Preview visibility, but the Source container is treated as the primary switch:

- In Source mode:
  - `sourceEditor.hidden = false`
  - `sourceEditor.style.display = 'flex'`
  - `sourceTextarea.hidden = false`
  - `sourceTextarea.style.display = 'block'`
  - `blocksContainer.hidden = true`
- In Preview mode:
  - `sourceEditor.hidden = true`
  - `sourceEditor.style.display = 'none'`
  - `sourceTextarea.hidden = true`
  - `sourceTextarea.style.display = 'none'`
  - `blocksContainer.hidden = false`

The implementation should treat the Source container as the top-level visibility boundary and the textarea hide/show as a defensive secondary measure.

### 2. Add a hard CSS guarantee in `media/editor.css`

Add an explicit rule so hidden state always wins for the Source container, even if another author rule sets display:

```css
#source-editor[hidden] {
  display: none !important;
}
```

This prevents the Source panel from occupying layout space in Preview mode if any class or stylesheet later reintroduces a conflicting display rule.

### 3. Reconfirm boot behavior in `media/editor.ts`

The boot path should continue to apply Preview visibility before initial content is rendered:

- Initialize the tab bar
- Apply Preview visibility
- Initialize empty state
- Post `ready`

No architecture change is needed, but implementation should preserve this ordering so the webview starts in a fully hidden Source state before the host sends the first update.

## Scope

- `media/modeHelpers.ts`
- `media/editor.css`
- Tests only as needed to verify initial Preview state and Source-to-Preview cleanup

Out of scope:

- Refactoring the editor into separate pages or routes
- Changes to extension-host message routing
- Inline block editor behavior

## Tests

Extend existing unit coverage with the following checks:

- `modeHelpers.test.ts`
  - Preview mode hides the full Source container and textarea
  - Source mode shows the full Source container and textarea
- A DOM-oriented webview visibility test
  - Initial Preview boot does not leave any visible Source panel area
  - Toggling Source -> Preview removes the Source panel completely rather than leaving a blank reserved region

## Acceptance Criteria

- Preview shows no blank Source panel on first load
- Preview shows no raw Source textarea after toggling Source -> Preview
- Source mode still shows the full textarea as before
- Existing mode-switch behavior remains unchanged apart from the visibility fix
