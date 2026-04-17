# Empty State Design

**Date:** 2026-04-15
**Status:** Draft

## Summary

Replace the current plain-text CSS `::before` empty state with a personality-driven empty state featuring an animated ghost pen character, rotating witty quotes (100+ pool), and multiple entry-point action buttons.

## Current State

- Preview mode empty: dashed border box with static text "Document is empty. Switch to Source to start writing." via CSS `::before` pseudo-element on `#blocks[data-empty="true"]`
- Source mode empty: blank textarea, no empty state (correct — source mode is for typing)
- No interactivity, no personality

## Design

### Visual Hierarchy (top to bottom)

1. **Ghost pen character** — inline SVG of a pen nib with a cute ghost tail, floating with a gentle vertical bob animation. `aria-hidden="true"`. Roughly 64×64px, monochrome using `--vscode-descriptionForeground` with reduced opacity.

2. **Witty quote** — randomly selected from a pool of 100+ lines. Understated wit tone. Displayed as a `<p>` in the body font, slightly larger than base. Fades in on appear (400ms opacity transition). Max width ~36ch for comfortable reading.

   Example quotes:
   - "Start with a heading. Or don't. We won't judge."
   - "This page is technically infinite. No pressure."
   - "The backspace key works too. Just saying."
   - "Markdown: because HTML has too many angle brackets."
   - "You're one `#` away from greatness."

3. **Action buttons** — horizontal row of pill-shaped buttons. Subtle border style matching VS Code's UI language. Hover: scale(1.03) + border color shift. Three options:

   | Button | Label | Action |
   |--------|-------|--------|
   | Start writing | "Start writing" | Switch to Source mode |
   | Basic structure | "Basic structure" | Insert skeleton template, switch to Source |
   | Table template | "Table template" | Insert GFM table template, switch to Source |

### Template Content

**Basic structure:**
```markdown
# Title

Your content here.

## Section

More content.
```

**Table template:**
```markdown
# Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
| Data     | Data     | Data     |
```

### Read-Only Mode

When `readOnly: true` (git diff panels), the empty state shows only the ghost pen + a static message ("Nothing here."). No action buttons — the user cannot edit.

### Accessibility

- Ghost pen SVG: `aria-hidden="true"`
- Quote: plain `<p>` element (not a live region — the quote is static once shown)
- Action buttons: standard `<button>` elements with descriptive text labels
- All interactive elements keyboard-focusable with visible focus rings
- `@media (prefers-reduced-motion: reduce)`: disable bob animation, keep fade-in instant

## Architecture

### New Files

**`media/emptyStateQuotes.ts`**
- Exports `const EMPTY_STATE_QUOTES: string[]` — 100+ witty one-liners
- Pure data, no logic

**`media/emptyState.ts`**
- Exports:
  - `createEmptyState(container: HTMLElement, readOnly: boolean, onAction: (action: EmptyStateAction) => void, pickQuote?: (quotes: string[]) => string): void` — builds and appends the empty state DOM into the container. Picks a random quote (or uses injected `pickQuote` for deterministic testing). Wires button click handlers. If `readOnly`, omits buttons and shows fallback message. No-ops if empty state DOM already exists in the container.
  - `destroyEmptyState(container: HTMLElement): void` — removes the empty state DOM from the container. No-ops if no empty state exists.
  - `type EmptyStateAction = 'start-writing' | 'basic-structure' | 'table-template'`

**`test/suite/emptyState.test.ts`**
- Tests for the empty state module

### Modified Files

**`media/modeHelpers.ts`**
- `updateEmptyState` stays as-is: sets/clears `data-empty` flag. No DOM creation.

**`media/editor.ts`**
- After every `updateEmptyState` call (initial load, update messages, mode switches back to preview), check the `data-empty` flag and call `createEmptyState` or `destroyEmptyState` accordingly. This covers: initial empty document, external edit arriving while empty state is visible (host pushes `update` → `renderAll` → `updateEmptyState` clears flag → `destroyEmptyState`).
- Handle `EmptyStateAction` callbacks:
  - `'start-writing'`: call `switchMode('source')`
  - `'basic-structure'`: call `renderAll(template, ...)` → `postEdit(template)` → `switchMode('source')` (source textarea is populated from serialized blocks inside `switchMode`)
  - `'table-template'`: same flow as basic-structure with table template content

**`media/editor.css`**
- Remove the existing `#blocks[data-empty="true"]` and `#blocks[data-empty="true"]::before` rules
- Add new styles for `.empty-state` container, `.empty-state-character`, `.empty-state-quote`, `.empty-state-actions`, and `.empty-state-btn`
- Ghost pen bob animation with `prefers-reduced-motion` guard
- Fade-in keyframe for the whole empty state
- Button hover/focus styles

**`test/suite/modeHelpers.test.ts`**
- Existing `updateEmptyState` tests remain unchanged (they test data attributes, not DOM)

### esbuild

No config changes needed — new `.ts` files in `media/` are imported by `editor.ts` and bundled automatically.

## Animation Specs

| Element | Property | Duration | Easing | Notes |
|---------|----------|----------|--------|-------|
| Ghost pen | `translateY(0 → -6px → 0)` | 3s | ease-in-out | infinite, `prefers-reduced-motion` guarded |
| Empty state container | `opacity(0 → 1)` | 400ms | ease-out | on mount |
| Action buttons | `transform: scale(1 → 1.03)` | 150ms | ease-out | on hover |

## Test Plan

| Test | What it verifies |
|------|-----------------|
| Quote pool has ≥100 entries | Content completeness |
| No duplicate quotes | Data quality |
| `createEmptyState` appends DOM to container | DOM creation |
| `createEmptyState` with `readOnly` omits buttons | Read-only guard |
| `createEmptyState` with `readOnly` shows fallback message | Read-only UX |
| `destroyEmptyState` removes all empty state DOM | Cleanup |
| `destroyEmptyState` on already-empty container is a no-op | Idempotency |
| Button click fires correct action callback | Interactivity |
| Ghost pen SVG has `aria-hidden="true"` | Accessibility |
| Quote is a plain `<p>`, no ARIA live region | Accessibility correctness |
| Calling `createEmptyState` twice doesn't duplicate DOM | Idempotency |
| `pickQuote` parameter controls quote selection in tests | Testability |
