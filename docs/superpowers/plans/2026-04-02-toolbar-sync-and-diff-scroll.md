# Toolbar Sync And Diff Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating save button with a top-toolbar mode and sync control, make autosave state understandable through a sync-style button, and add scroll synchronization for Markdown42 custom-editor diff panes.

**Architecture:** Keep the existing custom editor/webview split and extend it in-place. The UI work lives in the webview HTML, CSS, and sync-state logic; the save acknowledgement remains driven by host-confirmed updates; diff scroll sync is implemented as host-mediated coordination between paired webview panels so the two panes stay aligned without coupling outline behavior to compare scrolling.

**Tech Stack:** TypeScript, VS Code Custom Editor API, webview DOM/CSS, esbuild bundle, Mocha + chai/assert + sinon

---

### Task 1: Add message types and host-side pairing hooks for diff scroll sync

**Files:**
- Modify: `src/editor/MessageBus.ts`
- Modify: `src/editor/MarkscapeEditor.ts`
- Test: `test/suite/markscapeEditor.test.ts`

- [ ] **Step 1: Add scroll-sync message types in `src/editor/MessageBus.ts`**

Open `src/editor/MessageBus.ts` and extend the unions with concrete scroll-sync messages:

```typescript
export type HostToWebview =
  | { type: 'update'; content: string; version: number; config: WebviewConfig }
  | { type: 'scrollTo'; line: number }
  | { type: 'setMode'; mode: 'preview' | 'source' }
  | { type: 'configChange'; config: WebviewConfig }
  | { type: 'pairedScroll'; ratio: number };

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'edit'; content: string; version: number }
  | { type: 'save' }
  | { type: 'outline'; headings: HeadingNode[] }
  | { type: 'openLink'; href: string }
  | { type: 'error'; message: string }
  | { type: 'scrollSync'; ratio: number };
```

Keep the existing message names untouched and only add the two new cases.

- [ ] **Step 2: Add panel pairing storage in `src/editor/MarkscapeEditor.ts`**

Near the top of `src/editor/MarkscapeEditor.ts`, add a module-local registry that can pair live panels by document URI:

```typescript
const liveEditorsByDocument = new Map<string, Set<vscode.WebviewPanel>>();

function registerLiveEditor(documentKey: string, panel: vscode.WebviewPanel): void {
  const existing = liveEditorsByDocument.get(documentKey) ?? new Set<vscode.WebviewPanel>();
  existing.add(panel);
  liveEditorsByDocument.set(documentKey, existing);
}

function unregisterLiveEditor(documentKey: string, panel: vscode.WebviewPanel): void {
  const existing = liveEditorsByDocument.get(documentKey);
  if (!existing) return;
  existing.delete(panel);
  if (existing.size === 0) {
    liveEditorsByDocument.delete(documentKey);
  }
}

function getPairedPanels(
  documentKey: string,
  source: vscode.WebviewPanel
): vscode.WebviewPanel[] {
  const existing = liveEditorsByDocument.get(documentKey);
  if (!existing) return [];
  return [...existing].filter(panel => panel !== source);
}
```

This keeps the first implementation focused: any same-document sibling panel can receive forwarded scroll updates.

- [ ] **Step 3: Register, forward, and unregister scroll-sync participants in `src/editor/MarkscapeEditor.ts`**

Inside `resolveCustomTextEditor()`, add the registration and new message handling:

```typescript
const documentKey = document.uri.toString();
registerLiveEditor(documentKey, webviewPanel);

// inside the message switch
case 'scrollSync': {
  for (const peer of getPairedPanels(documentKey, webviewPanel)) {
    peer.webview.postMessage({ type: 'pairedScroll', ratio: msg.ratio });
  }
  break;
}
```

And in the dispose block:

```typescript
unregisterLiveEditor(documentKey, webviewPanel);
```

Do not change the existing edit/save/config logic in this task.

- [ ] **Step 4: Add a targeted host regression test in `test/suite/markscapeEditor.test.ts`**

Append a narrow unit test that exercises the forwarding branch by stubbing two panels for the same document key and asserting the peer receives `{ type: 'pairedScroll', ratio: 0.5 }`.

Use this exact test skeleton and adjust only the local helper wiring needed to match the existing file:

```typescript
  test('forwards scroll sync messages to sibling panels for the same document', async () => {
    const posted: unknown[] = [];
    const panelA = makeFakePanel();
    const panelB = makeFakePanel();
    panelB.webview.postMessage = (msg: unknown) => {
      posted.push(msg);
      return Promise.resolve(true);
    };

    await resolveEditorWithPanel(panelA);
    await resolveEditorWithPanel(panelB);

    panelA.fireMessage({ type: 'scrollSync', ratio: 0.5 });

    assert.deepStrictEqual(posted, [{ type: 'pairedScroll', ratio: 0.5 }]);
  });
```

The point of the test is the forwarding contract, not the full diff workbench environment.

- [ ] **Step 5: Compile and run the targeted host test**

Run:

```bash
npm run compile:test
npx mocha --ui tdd "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
```

Expected: the new forwarding test passes along with the existing `markscapeEditor` tests.

- [ ] **Step 6: Commit the host-side message and pairing groundwork**

Run:

```bash
git add src/editor/MessageBus.ts src/editor/MarkscapeEditor.ts test/suite/markscapeEditor.test.ts
git commit -m "feat: add host diff scroll sync forwarding"
```

---

### Task 2: Replace the floating save button with a toolbar sync control

**Files:**
- Modify: `src/editor/MarkscapeEditor.ts`
- Modify: `media/editor.css`
- Test: `test/suite/markscapeEditor.test.ts`

- [ ] **Step 1: Update the webview HTML in `src/editor/MarkscapeEditor.ts`**

Replace the current top markup inside `buildHtml()` with a toolbar structure like this:

```typescript
  <div id="toolbar" role="toolbar" aria-label="Markdown42 toolbar">
    <div id="toolbar-modes" role="tablist" aria-label="Editor mode">
      <button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">
        <span class="toolbar-icon" aria-hidden="true">...</span>
        <span>Preview</span>
      </button>
      <button role="tab" aria-selected="false" data-mode="source" id="tab-source">
        <span class="toolbar-icon" aria-hidden="true">...</span>
        <span>Source</span>
      </button>
    </div>
    <div id="toolbar-actions">
      <button id="sync-btn" type="button" aria-live="polite" aria-label="Sync status"></button>
    </div>
  </div>
```

Use inline SVG spans for the Preview eye icon, Source code icon, and leave the actual sync icon content to the webview script.

- [ ] **Step 2: Replace the old save-button CSS with toolbar styling in `media/editor.css`**

Remove the floating `#save-btn` styling block and add a compact toolbar treatment:

```css
#toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

#toolbar-modes {
  display: flex;
  align-items: center;
  gap: 8px;
}

#toolbar-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}

#sync-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
}
```

Then add stateful selectors for `#sync-btn[data-state="syncing"]`, `#sync-btn[data-state="dirty"]`, and `#sync-btn[data-state="synced"]` using theme colors already present in the stylesheet.

- [ ] **Step 3: Add a focused HTML regression test in `test/suite/markscapeEditor.test.ts`**

Append a test that asserts the new toolbar and sync button are present:

```typescript
  test('buildHtml includes toolbar mode buttons and sync action button', () => {
    const html = buildTabBarHtml();
    assert.ok(html.includes('id="toolbar"'), html);
    assert.ok(html.includes('id="tab-preview"'), html);
    assert.ok(html.includes('id="tab-source"'), html);
    assert.ok(html.includes('id="sync-btn"'), html);
  });
```

- [ ] **Step 4: Rebuild the webview bundle**

Run:

```bash
npm run build:webview
```

Expected: esbuild completes successfully and rewrites `media/editor.js`.

- [ ] **Step 5: Re-run the targeted toolbar test**

Run:

```bash
npm run compile:test
npx mocha --ui tdd "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
```

Expected: the toolbar HTML tests all pass with the new structure.

- [ ] **Step 6: Commit the toolbar markup and CSS**

Run:

```bash
git add src/editor/MarkscapeEditor.ts media/editor.css media/editor.js media/editor.js.map test/suite/markscapeEditor.test.ts
git commit -m "feat: move editor actions into top toolbar"
```

---

### Task 3: Implement sync-state behavior in the webview

**Files:**
- Modify: `media/editor.ts`
- Modify: `src/settings/config.ts`
- Test: `test/suite/tabBar.test.ts`

- [ ] **Step 1: Include `autoSave` in the webview config in `src/settings/config.ts`**

Update `toWebviewConfig()` so the webview receives the autosave setting:

```typescript
export function toWebviewConfig(config: Markdown42Config): WebviewConfig {
  return {
    fontSize: config.fontSize,
    lineWidth: config.lineWidth,
    renderDelay: config.renderDelay,
    syncScrollOutline: config.syncScrollOutline,
    mode: config.defaultMode,
    autoSave: config.autoSave,
  };
}
```

Also extend the `WebviewConfig` type in `src/editor/MessageBus.ts` with:

```typescript
autoSave: boolean;
```

- [ ] **Step 2: Replace `markUnsaved()` and `markSaved()` in `media/editor.ts` with explicit sync states**

Introduce these declarations near the top of `media/editor.ts`:

```typescript
type SyncState = 'synced' | 'syncing' | 'dirty';

let syncState: SyncState = 'synced';
let pendingEditVersion: number | null = null;
```

Then replace the old save-indicator helpers with an `applySyncState()` helper:

```typescript
function applySyncState(state: SyncState): void {
  syncState = state;
  syncBtn.dataset.state = state;
  syncBtn.title =
    state === 'syncing'
      ? 'Syncing changes...'
      : currentConfig.autoSave
        ? 'Synced automatically'
        : state === 'dirty'
          ? 'Save changes'
          : 'No unsaved changes';
}
```

- [ ] **Step 3: Update edit and update flows in `media/editor.ts` to use host-confirmed sync acknowledgement**

Use this behavior:

```typescript
function triggerSave(): void {
  vscode.postMessage({ type: 'save' });
  applySyncState('syncing');
}

function postEdit(content: string): void {
  vscode.postMessage({ type: 'edit', content, version: localVersion });
  pendingEditVersion = localVersion;
  applySyncState(currentConfig.autoSave ? 'syncing' : syncState);
}
```

And inside the `update` message case, after `localVersion = data.version;`:

```typescript
if (pendingEditVersion !== null && data.version >= pendingEditVersion) {
  applySyncState(currentConfig.autoSave ? 'synced' : 'dirty');
  pendingEditVersion = null;
} else if (currentConfig.autoSave && syncState === 'syncing') {
  applySyncState('synced');
}
```

When manual save is explicitly triggered and the host echoes back the saved document, the state should settle back to `synced`.

- [ ] **Step 4: Make the toolbar sync button real in `media/editor.ts`**

Replace the old floating-button creation with:

```typescript
const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
syncBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5A5.5 5.5 0 0 0 3.4 3.6"/><path d="M2.5 6V3h3"/><path d="M2.5 10.5A5.5 5.5 0 0 0 12.6 12.4"/><path d="M13.5 10V13h-3"/></svg>';
syncBtn.addEventListener('click', triggerSave);
applySyncState('synced');
```

Do not recreate the button dynamically anymore; use the toolbar placeholder from the HTML.

- [ ] **Step 5: Add focused sync-state tests in `test/suite/tabBar.test.ts`**

Append pure-function-style tests that mirror the sync-state rules:

```typescript
  test('autosave update confirmation returns sync state to synced', () => {
    const applySyncState = sinon.spy();
    const state = { autoSave: true, pendingEditVersion: 4 };

    handleConfirmedUpdate(4, state, applySyncState);

    assert.ok(applySyncState.calledOnceWithExactly('synced'));
    assert.strictEqual(state.pendingEditVersion, null);
  });

  test('manual mode confirmation keeps state dirty until explicit save', () => {
    const applySyncState = sinon.spy();
    const state = { autoSave: false, pendingEditVersion: 4 };

    handleConfirmedUpdate(4, state, applySyncState);

    assert.ok(applySyncState.calledOnceWithExactly('dirty'));
    assert.strictEqual(state.pendingEditVersion, null);
  });
```

Inline the helper used by these tests at the top of the file, the same way the existing tab-bar tests mirror editor logic.

- [ ] **Step 6: Rebuild and run the targeted sync-state tests**

Run:

```bash
npm run build:webview
npm run compile:test
npx mocha --ui tdd "out-test/test/suite/tabBar.test.js" --timeout 10000
```

Expected: sync-state tests pass and the webview bundle rebuilds cleanly.

- [ ] **Step 7: Commit the sync-state implementation**

Run:

```bash
git add src/settings/config.ts src/editor/MessageBus.ts media/editor.ts media/editor.js media/editor.js.map test/suite/tabBar.test.ts
git commit -m "feat: show sync status in toolbar"
```

---

### Task 4: Implement webview diff scroll publishing and loop-safe receiving

**Files:**
- Modify: `media/editor.ts`
- Test: `test/suite/tabBar.test.ts`

- [ ] **Step 1: Add outbound scroll publishing with a loop guard in `media/editor.ts`**

Near the scroll-handling section, add:

```typescript
let suppressScrollSync = false;
let scrollSyncTimer: ReturnType<typeof setTimeout> | null = null;

function getScrollRatio(): number {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  if (maxScroll === 0) return 0;
  return window.scrollY / maxScroll;
}
```

Then update the `window.addEventListener('scroll', ...)` handler so it publishes after the outline logic:

```typescript
  if (!suppressScrollSync) {
    if (scrollSyncTimer) clearTimeout(scrollSyncTimer);
    scrollSyncTimer = setTimeout(() => {
      vscode.postMessage({ type: 'scrollSync', ratio: getScrollRatio() });
    }, 40);
  }
```

- [ ] **Step 2: Handle paired scroll messages in `media/editor.ts`**

Inside the webview message switch, add:

```typescript
    case 'pairedScroll': {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      suppressScrollSync = true;
      window.scrollTo({ top: maxScroll * data.ratio, behavior: 'auto' });
      window.setTimeout(() => {
        suppressScrollSync = false;
      }, 80);
      break;
    }
```

This keeps forwarding simple and blocks immediate feedback loops.

- [ ] **Step 3: Add pure tests for ratio math and loop suppression in `test/suite/tabBar.test.ts`**

Add compact helper tests such as:

```typescript
  test('scroll ratio is zero when there is no scrollable overflow', () => {
    assert.strictEqual(computeScrollRatio(0, 800, 800), 0);
  });

  test('paired scroll maps ratio onto local max scroll', () => {
    assert.strictEqual(applyPairedScrollRatio(0.5, 1800, 800), 500);
  });
```

Define these tiny helper functions at the top of the file to mirror the same arithmetic used in `media/editor.ts`.

- [ ] **Step 4: Rebuild and run the targeted scroll tests**

Run:

```bash
npm run build:webview
npm run compile:test
npx mocha --ui tdd "out-test/test/suite/tabBar.test.js" --timeout 10000
```

Expected: the new scroll tests pass and the bundle builds successfully.

- [ ] **Step 5: Commit the webview diff scroll behavior**

Run:

```bash
git add media/editor.ts media/editor.js media/editor.js.map test/suite/tabBar.test.ts
git commit -m "feat: sync scroll position across diff panes"
```

---

### Task 5: Run end-to-end verification and manual smoke checks

**Files:**
- Verify only: `src/editor/MessageBus.ts`
- Verify only: `src/editor/MarkscapeEditor.ts`
- Verify only: `src/settings/config.ts`
- Verify only: `media/editor.ts`
- Verify only: `media/editor.css`
- Verify only: `test/suite/markscapeEditor.test.ts`
- Verify only: `test/suite/tabBar.test.ts`

- [ ] **Step 1: Run the full webview and unit verification**

Run:

```bash
npm run build:webview
npm run compile
npm run compile:test
npm run test:unit
```

Expected: all TypeScript compiles succeed and the full unit suite passes.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: ESLint exits cleanly with no new issues.

- [ ] **Step 3: Manually verify toolbar and sync behavior in the Extension Development Host**

Press `F5` in VS Code, open a markdown file in Markdown42, and confirm:

```text
1. Preview and Source appear in the top toolbar with proper icons.
2. The floating save button is gone.
3. With markdown42.autoSave = true, editing shows a syncing state and then settles back to synced.
4. With markdown42.autoSave = false, editing leaves the sync button in a save-needed state, and clicking it saves successfully.
5. Source and Preview switching still works without layout glitches.
```

- [ ] **Step 4: Manually verify diff scroll syncing**

In the Extension Development Host, open a markdown compare/diff view that uses Markdown42 on both sides and confirm:

```text
1. Scrolling one pane moves the other pane in the same general position.
2. Scroll syncing does not oscillate or jitter continuously.
3. Outline updates still work in the active pane.
4. Single-pane normal editors still behave normally.
```

- [ ] **Step 5: Commit any final verification-driven adjustments**

If verification required no code changes, skip this step. If a tiny follow-up change was needed, run:

```bash
git add <changed-files>
git commit -m "fix: polish toolbar sync and diff scrolling"
```

## Self-Review

- Spec coverage: the plan covers the top-toolbar redesign, mode icons, sync-button behavior for autosave and manual save, host-confirmed sync acknowledgement, and diff-pane scroll synchronization with loop prevention.
- Placeholder scan: all steps use concrete files, commands, and code snippets; no TODO/TBD markers remain.
- Type consistency: `pairedScroll`, `scrollSync`, `autoSave`, `SyncState`, `pendingEditVersion`, and the toolbar ids are named consistently across tasks.
