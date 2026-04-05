# Design Spec: Markdown42 Foundation Improvements (Session 1)

**Date:** 2026-03-26
**Status:** Approved for implementation
**Extension:** `Shaf.markdown42` v0.1.1
**Scope:** P1-1 (minimal), P1-2, P4-2, P3-1 (escapeAction only)
**Delivery:** Two PRs (PR 1: package.json only; PR 2: behaviour)

---

## Context

Markdown42 is a Typora-style inline WYSIWYG Markdown editor for VS Code. This spec covers the first batch of foundation improvements from the broader PRD. Items were selected to fix real user-facing issues (keybinding conflict, missing Command Palette entries, Escape behaviour) without adding features whose dependencies haven't been built yet.

**Out of scope for this session:** custom undo buffer (VS Code's `WorkspaceEdit` undo stack is sufficient), any P2/P3 features (image paste, YAML front matter, export, word count, math), settings with no backing implementation.

---

## Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| `escapeAction` default | `"commit"` (Typora-style) | Matches Typora UX; revert is available via setting |
| Custom undo buffer | Skipped | Edits flow through `WorkspaceEdit`; VS Code undo works post-auto-save |
| Keybinding change | `Ctrl+Shift+M` / `Cmd+Shift+M` | 15 installs — clean break is low-risk; `Ctrl+\`` conflicts with terminal |
| Settings expansion | `escapeAction` only | No skeleton settings without backing implementation |
| Delivery | Two PRs | Zero-risk metadata PR first; behaviour PR separately |
| Status bar item scope | One per editor instance (created in `resolveCustomTextEditor`) | Acceptable for v0.1.x; if two `.md` files are open simultaneously both show the item. Promote to `activate()`-level singleton in a future pass if it becomes noticeable. |
| First-run warning trigger | Fires once the first time `autoSave: true` is observed at activation | Covers both initial install (if autoSave is on by default) and users who later toggle autoSave on. The `globalState` key is set on first fire and never re-fires. |

---

## PR 1 — `package.json` Changes Only

### 1.1 Keybinding

Replace the existing `ctrl+backtick` binding for `markdown42.toggleSource`:

```json
{
  "command": "markdown42.toggleSource",
  "key": "ctrl+shift+m",
  "mac": "cmd+shift+m",
  "when": "markdown42EditorActive"
}
```

The `when: "markdown42EditorActive"` clause is retained (context key is set in `MarkscapeEditor.ts` on editor open).

**Note:** The webview (`media/editor.ts`) contains an in-webview keyboard handler that listens for `Ctrl+\`` — this is a browser-side handler independent of VS Code keybindings. It must be updated in PR 2 to match the new key (see section 2.4).

### 1.2 Command Palette Registrations

Update the four existing commands in `contributes.commands` with proper display titles. Add `markdown42.openInMarkdown42` to the Explorer context menu for `.md` files.

| Command ID | Title | Context menu |
|---|---|---|
| `markdown42.toggleSource` | `Markdown42: Toggle Preview / Source` | No |
| `markdown42.openInMarkdown42` | `Markdown42: Open in Markdown42` | Yes — `.md` files in Explorer |
| `markdown42.save` | `Markdown42: Save` | No |
| `markdown42.refreshOutline` | `Markdown42: Refresh Outline` | No |

Explorer context menu entry (add to `contributes.menus`). Note: `resourceExtname` in VS Code `when` expressions includes the leading dot, so `== '.md'` is correct:

```json
"explorer/context": [
  {
    "command": "markdown42.openInMarkdown42",
    "when": "resourceExtname == '.md'",
    "group": "navigation"
  }
]
```

### 1.3 `escapeAction` Setting

Add to `contributes.configuration.properties`:

```json
"markdown42.escapeAction": {
  "type": "string",
  "enum": ["commit", "revert"],
  "enumDescriptions": [
    "Commit the edit and return to preview (Typora-style)",
    "Discard the edit and restore the original block content"
  ],
  "default": "commit",
  "description": "What the Escape key does when editing a block inline in Preview mode"
}
```

---

## PR 2 — Behaviour Changes

### 2.1 Config Layer (`src/settings/config.ts`)

Add `escapeAction` to `Markdown42Config` and export the type:

```typescript
export type EscapeAction = 'commit' | 'revert';

export interface Markdown42Config {
  defaultMode: EditorMode;
  fontSize: number;
  lineWidth: number;
  syncScrollOutline: boolean;
  enableTelemetry: boolean;
  renderDelay: number;
  autoSave: boolean;
  escapeAction: EscapeAction;  // new
}
```

Update `getConfig()` to read it:
```typescript
escapeAction: cfg.get<EscapeAction>('escapeAction', 'commit'),
```

Update `toWebviewConfig()` to project the field:
```typescript
export function toWebviewConfig(config: Markdown42Config): WebviewConfig {
  return {
    fontSize: config.fontSize,
    lineWidth: config.lineWidth,
    renderDelay: config.renderDelay,
    syncScrollOutline: config.syncScrollOutline,
    mode: config.defaultMode,
    escapeAction: config.escapeAction,  // new
  };
}
```

### 2.2 Message Bus (`src/editor/MessageBus.ts`)

Add `escapeAction` to `WebviewConfig`:

```typescript
export interface WebviewConfig {
  fontSize: number;
  lineWidth: number;
  renderDelay: number;
  syncScrollOutline: boolean;
  mode: 'preview' | 'source';
  escapeAction: 'commit' | 'revert';  // new
}
```

### 2.3 Inline Editor (`media/inlineEditor.ts`)

Extend `enterEditMode` to accept `escapeAction` with a default of `'commit'` so existing test call sites (which pass only 5 arguments) continue to compile:

```typescript
export function enterEditMode(
  blockEl: HTMLElement,
  rawMarkdown: string,
  blockIndex: number,
  callbacks: InlineEditorCallbacks,
  renderDelay: number,
  escapeAction: 'commit' | 'revert' = 'commit'  // default preserves existing call sites
): void
```

Change the `keydown` handler for Escape:

```typescript
if (e.key === 'Escape') {
  e.preventDefault();
  e.stopPropagation();
  if (blurTimer) clearTimeout(blurTimer);
  if (escapeAction === 'commit') {
    _commitBlock(blockEl, blockIndex, textarea.value, callbacks);
  } else {
    _cancelBlock(blockEl, blockIndex, callbacks);
  }
}
```

Update the `aria-label` on the textarea to be accurate for both modes:

```typescript
textarea.setAttribute(
  'aria-label',
  escapeAction === 'commit'
    ? 'Edit block content — Esc or Ctrl+Enter to save'
    : 'Edit block content — Esc to cancel, Ctrl+Enter to save'
);
```

### 2.4 Webview Entry (`media/editor.ts`)

**Remove the in-webview `Ctrl+\`` keyboard handler** (currently around line 230, listens for `` e.key === '`' && e.ctrlKey ``). The webview toggle is driven by the host via the `setMode` message; the in-webview shortcut handler is the source of truth for the old key and must be replaced with `Ctrl+Shift+M`:

```typescript
// Replace the old Ctrl+` handler with:
// Use .toLowerCase() to handle keyboard layouts that report 'm' instead of 'M' when Shift is held.
if (e.key.toLowerCase() === 'm' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
  toggleMode();
}
```

Pass `escapeAction` from `currentConfig` when calling `enterEditMode`:

```typescript
enterEditMode(
  blockEl,
  rendered.raw,
  blockIndex,
  { onCommit: ..., onCancel: ... },
  currentConfig.renderDelay,
  currentConfig.escapeAction
);
```

Initialise `currentConfig.escapeAction` with the default value:
```typescript
let currentConfig: WebviewConfig = {
  fontSize: 16,
  lineWidth: 860,
  renderDelay: 150,
  syncScrollOutline: true,
  mode: 'preview',
  escapeAction: 'commit',  // new
};
```

The existing `applyConfig` function assigns `currentConfig = config` on `configChange` messages — no change needed there; `escapeAction` flows through automatically once added to `WebviewConfig`.

### 2.5 Auto-Save Status Bar (`src/editor/MarkscapeEditor.ts`)

Create a `vscode.StatusBarItem` per editor instance inside `resolveCustomTextEditor`. Show it for 2 seconds after each auto-save flush. Dispose it when the panel closes.

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);
statusBarItem.text = '$(check) Markdown42: Auto-saved';

// In the 'edit' message handler, after await model.save():
statusBarItem.show();
setTimeout(() => statusBarItem.hide(), 2000);

// In webviewPanel.onDidDispose:
statusBarItem.dispose();
```

> **Note:** If two `.md` files are open simultaneously, each has its own status bar item — both may flash briefly. This is acceptable for v0.1.x.

### 2.6 First-Run Auto-Save Warning (`src/extension.ts`)

In `activate()`, show a one-time warning the first time `autoSave: true` is observed. The `globalState` key persists across restarts, so this fires at most once per VS Code installation — even if the user later toggles `autoSave` off and back on.

```typescript
const config = getConfig();
const warned = context.globalState.get<boolean>('markdown42.autoSaveWarningShown', false);

if (config.autoSave && !warned) {
  vscode.window.showInformationMessage(
    'Markdown42: Auto-save is on. Edits are written to disk immediately. Undo (Ctrl+Z) is still available.'
  );
  context.globalState.update('markdown42.autoSaveWarningShown', true);
}
```

---

## Files Changed

| File | PR | Change |
|---|---|---|
| `package.json` | 1 | Keybinding (`ctrl+shift+m`), command titles, context menu, `escapeAction` setting |
| `src/settings/config.ts` | 2 | Add `EscapeAction` type, `escapeAction` field to config; update `toWebviewConfig()` |
| `src/editor/MessageBus.ts` | 2 | Add `escapeAction` to `WebviewConfig` |
| `src/extension.ts` | 2 | First-run auto-save warning |
| `src/editor/MarkscapeEditor.ts` | 2 | Status bar item for auto-save confirmation |
| `media/inlineEditor.ts` | 2 | `escapeAction` parameter (default `'commit'`); Escape handler; `aria-label` update |
| `media/editor.ts` | 2 | Replace `Ctrl+\`` handler with `Ctrl+Shift+M`; pass `escapeAction` to `enterEditMode`; initialise default in `currentConfig` |

---

## Tests

All tests use the existing mocha/chai/sinon/jsdom stack in `test/suite/`. Coverage thresholds: 80% lines/functions, 75% branches.

### `inlineEditor.test.ts` (new or extended)

- **Escape with `escapeAction: 'commit'`** — enter edit mode, press Escape, verify `onCommit` is called with the textarea value
- **Escape with `escapeAction: 'revert'`** — enter edit mode, press Escape, verify `onCancel` is called and `onCommit` is not
- **Escape uses `'commit'` when parameter omitted** — call `enterEditMode` with 5 args (no `escapeAction`), press Escape, verify `onCommit` is called
- **Ctrl+Enter commits regardless of `escapeAction`** — test with both `'commit'` and `'revert'`; verify `onCommit` is called in both cases

> **Important — existing test update required:** The existing test `'Escape key triggers cancel callback'` calls `enterEditMode` with 5 arguments. After the implementation lands, the default `escapeAction` will be `'commit'`, so that test will silently exercise the commit path instead of cancel. Update that test to explicitly pass `'revert'` as the sixth argument to preserve its original intent.

### `config.test.ts` (new or extended)

- **`escapeAction` defaults to `'commit'`** — call `getConfig()` with no workspace override, verify `escapeAction === 'commit'`
- **`escapeAction: 'revert'` roundtrips through `getConfig()`** — mock workspace config returning `'revert'`, verify `getConfig().escapeAction === 'revert'`
- **`escapeAction` is projected by `toWebviewConfig()`** — pass a config with `escapeAction: 'revert'`, verify the returned `WebviewConfig.escapeAction === 'revert'`
- **Live config change propagates `escapeAction`** — verify that `toWebviewConfig()` picks up the new value when called after a simulated `onDidChangeConfiguration` (tests the `configChange` message path indirectly)

---

## Acceptance Criteria

- [ ] `Ctrl+Shift+M` toggles Preview ↔ Source inside a Markdown42 editor (both via VS Code keybinding and in-webview handler)
- [ ] `Ctrl+\`` no longer triggers the toggle inside the webview
- [ ] All 4 commands appear in `Ctrl+Shift+P` Command Palette when a `.md` file is open
- [ ] `Markdown42: Open in Markdown42` appears in Explorer right-click menu on `.md` files
- [ ] Escape commits the in-progress block edit by default (`escapeAction: "commit"`)
- [ ] Setting `escapeAction: "revert"` makes Escape restore the original block content
- [ ] Status bar shows `✓ Markdown42: Auto-saved` for 2s after every auto-save flush
- [ ] First-run auto-save notice fires once (at first activation where `autoSave: true`) and is suppressed on all subsequent activations
- [ ] All new/changed behaviour covered by unit tests
- [ ] `npm run test:unit` passes with no regressions
- [ ] `npm run lint` passes clean
