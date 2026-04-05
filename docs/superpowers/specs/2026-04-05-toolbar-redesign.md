# Toolbar Redesign — Sync Indicator + Segmented Toggle

**Date:** 2026-04-05  
**Status:** Approved

## Problem

The current toolbar has two issues:

1. The save button is hidden (`opacity: 0`) by default and only appears when the document is dirty. With auto-save enabled by default, users never see it — they get no feedback that saves are happening.
2. The Preview/Source toggle buttons are plain text with minimal visual weight; there are no leading icons to aid recognition.

## Goal

Redesign the toolbar so it:
- Always communicates the current save/sync state to the user
- Makes the mode toggle more visually distinctive with icons
- Introduces a satisfying sync animation without any GIF or external asset dependency
- Keeps all save/auto-save mechanics unchanged (only the visual layer changes)

## Design

### Layout

```
[ ◉ Preview   </> Source ]                    [ ✓ Saved ]
  ←────── segmented pill ──────→              ←─ status ─→
```

The tab bar retains its sticky positioning and adds `backdrop-filter: blur(8px)` to feel elevated over scrolling content.

### Segmented Pill Toggle

The two mode buttons (`#tab-preview`, `#tab-source`) are wrapped in a single pill container (`border-radius: 20px`). Each button has a small leading SVG icon + label text:

- **Preview**: eye icon + "Preview"
- **Source**: code-brackets icon (`</>`) + "Source"

Active button: filled with `var(--vscode-button-background)` / `var(--vscode-button-foreground)`.  
Inactive button: transparent background, `var(--vscode-descriptionForeground)` text.  
Hover on inactive: `var(--vscode-list-hoverBackground)`.

### Sync Status Indicator

Replaces `#save-btn`. Always visible. Three states:

| State | Icon | Label | Color |
|---|---|---|---|
| Saved | `✓` checkmark | "Saved" | `--vscode-descriptionForeground` (muted) |
| Syncing | CSS spinner ring | "Syncing…" | `--vscode-focusBorder` (accent) |
| Unsaved | `●` dot | "Save" | `--vscode-notificationsWarningIcon-foreground` (amber) |

Clicking the indicator always calls `triggerSave()`.

The unsaved state only appears when auto-save is off or debounce lag is significant. With auto-save on (the default), users will primarily see Saved ↔ Syncing transitions.

### Sync Animation

Pure CSS — no GIF, no external file.

A `::before` pseudo-element renders a 2px circular ring around the status indicator. Three-quarters of the ring is `var(--vscode-focusBorder)`, one quarter is transparent — producing a "chasing arc" spinner. It rotates via:

```css
@keyframes spin-ring {
  to { transform: rotate(360deg); }
}
```

Speed: 600ms linear infinite. Starts when syncing state begins, stops and fades when `markSaved()` fires.

The label ("Syncing…" → "Saved ✓") crossfades with a 150ms opacity transition. Both labels share a fixed minimum width to prevent layout shift.

### Minimum Spinner Duration

Currently `markSaved()` is called immediately after `postMessage({ type: 'save' })`. We add a `setTimeout` of 600ms before calling `markSaved()` when in syncing state, ensuring the spinner is always visible long enough for the user to notice.

## Files Changed

| File | Change |
|---|---|
| `media/editor.css` | Replace `#tab-bar` and `#save-btn` styles; add segmented pill styles; add `@keyframes spin-ring` and spinner pseudo-element |
| `media/editor.ts` | Add syncing state class on save trigger; add 600ms minimum delay before `markSaved()`; update SVG/markup references |
| `src/editor/MarkscapeEditor.ts` | Update HTML: add pill wrapper around mode buttons, add icons, replace save button with status indicator markup |

## Out of Scope

- No changes to `MessageBus`, `DocumentModel`, `autoSave` config key, or any tests
- No new files created
- No changes to the underlying save/auto-save logic
