# Toolbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hidden save button and plain text mode toggle with a segmented pill toggle (with icons) and an always-visible sync status indicator that animates during saves.

**Architecture:** HTML structure changes in `MarkscapeEditor.ts`; CSS drives all three indicator states (`saved`/`syncing`) via `data-state` attribute; JS manages state transitions with a 700ms minimum spinner duration. No new files. No changes to MessageBus, DocumentModel, or auto-save config.

**Tech Stack:** TypeScript (extension host + webview), CSS custom properties (VS Code theme vars), esbuild (webview bundle), mocha/chai (unit tests)

---

## File Map

| File | Change |
|---|---|
| `src/editor/MarkscapeEditor.ts` | Replace tab-bar HTML: add `.mode-toggle` pill wrapper + SVG icons + `#sync-btn` indicator |
| `test/suite/markscapeEditor.test.ts` | Update HTML assertions for new structure; add sync-btn tests |
| `media/editor.css` | Replace `#tab-bar button` section + `#save-btn` section with pill + indicator styles + `@keyframes spin-ring` |
| `media/editor.ts` | Replace `saveBtn`/`markUnsaved`/`markSaved` with `syncBtn`/`markSyncing`/`markSaved`; remove `hasUnsavedChanges` |

---

## Task 1: Update HTML structure in MarkscapeEditor.ts

**Files:**
- Modify: `src/editor/MarkscapeEditor.ts:189-192`

- [ ] **Step 1: Write failing tests** in `test/suite/markscapeEditor.test.ts`

  Open `test/suite/markscapeEditor.test.ts`. At the end of the existing `suite('MarkscapeEditor buildHtml tab bar', ...)` block (after the last `test(...)` call, before the closing `}`), add these tests:

  ```typescript
    test('mode buttons are wrapped in a .mode-toggle pill container', () => {
      const html = buildHtml();
      assert.ok(html.includes('class="mode-toggle"'), html);
    });

    test('Preview tab has an SVG icon', () => {
      const html = buildHtml();
      // The tab-preview button must contain an SVG with class tab-icon
      assert.ok(html.includes('tab-icon'), html);
    });

    test('sync-btn replaces save-btn in the tab bar', () => {
      const html = buildHtml();
      assert.ok(html.includes('id="sync-btn"'), html);
      assert.ok(!html.includes('id="save-btn"'), 'save-btn should not exist');
    });

    test('sync-btn has initial data-state of saved', () => {
      const html = buildHtml();
      assert.ok(html.includes('data-state="saved"'), html);
    });

    test('sync-btn contains .sync-text span', () => {
      const html = buildHtml();
      assert.ok(html.includes('class="sync-text"'), html);
    });
  ```

  Also update the existing `'save button is in the tab bar HTML'` test (line ~137) to check for `sync-btn` instead of `save-btn`:

  ```typescript
    test('sync button is in the tab bar HTML', () => {
      const html = buildHtml();
      const tabBarMatch = html.match(/<div id="tab-bar"[^>]*>([\s\S]*?)<\/div>/);
      assert.ok(tabBarMatch, 'tab-bar div not found');
      assert.ok(tabBarMatch[1].includes('id="sync-btn"'), 'sync-btn not inside tab-bar');
    });
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npm run compile && npx mocha --ui tdd "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
  ```

  Expected: `AssertionError` on the new tests (sync-btn not found, mode-toggle not found).

- [ ] **Step 3: Update the HTML in MarkscapeEditor.ts**

  In `src/editor/MarkscapeEditor.ts`, find and replace the tab-bar block (the 4-line block starting with `<div id="tab-bar"`):

  **Find:**
  ```html
    <div id="tab-bar" role="tablist" aria-label="Editor mode">
      <button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">Preview</button>
      <button role="tab" aria-selected="false" data-mode="source" id="tab-source">Source</button>
      <button id="save-btn" type="button" aria-label="Save file" title="Save (Ctrl+S)"></button>
    </div>
  ```

  **Replace with:**
  ```html
    <div id="tab-bar" role="tablist" aria-label="Editor mode">
      <div class="mode-toggle">
        <button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">
          <svg class="tab-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/></svg>
          Preview
        </button>
        <button role="tab" aria-selected="false" data-mode="source" id="tab-source">
          <svg class="tab-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 4 1 8 5 12"/><polyline points="11 4 15 8 11 12"/></svg>
          Source
        </button>
      </div>
      <button id="sync-btn" type="button" data-state="saved" aria-label="Document sync status" title="Saved (Ctrl+S)">
        <svg class="icon-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 9 6 13 14 4"/></svg>
        <svg class="icon-spin" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 2a6 6 0 1 1-6 6"/></svg>
        <span class="sync-text">Saved</span>
      </button>
    </div>
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run compile && npx mocha --ui tdd "out-test/test/suite/markscapeEditor.test.js" --timeout 10000
  ```

  Expected: All tests pass including the 5 new ones.

- [ ] **Step 5: Commit**

  ```bash
  git add src/editor/MarkscapeEditor.ts test/suite/markscapeEditor.test.ts
  git commit -m "feat: update tab-bar HTML — pill toggle + sync indicator"
  ```

---

## Task 2: Replace CSS styles

**Files:**
- Modify: `media/editor.css` (tab bar section ~lines 170-216, save-btn section ~lines 804-865)

> Note: CSS has no unit tests — verify by building the webview and pressing F5.

- [ ] **Step 1: Replace the tab-bar CSS section**

  In `media/editor.css`, find the entire block from `/* TAB BAR — Preview / Source toggle */` through the closing `}` of `#tab-bar button:focus-visible` (currently lines ~170–216).

  **Find** (the comment + all rules up to and including the focus-visible rule):
  ```css
  /* ═══════════════════════════════════════════════════
     TAB BAR — Preview / Source toggle
  ═══════════════════════════════════════════════════ */
  #tab-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: var(--sp-2) var(--sp-4);
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  #tab-bar button {
    padding: var(--sp-1) var(--sp-4);
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    font-family: var(--font-body);
    font-size: 0.8em;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition:
      background var(--dur-fast) var(--ease-snap),
      color var(--dur-fast) var(--ease-snap),
      border-color var(--dur-fast) var(--ease-snap);
  }
  
  #tab-bar button:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-editor-foreground);
  }
  
  #tab-bar button[aria-selected="true"] {
    background: color-mix(in srgb, var(--vscode-focusBorder) 15%, var(--vscode-editor-background));
    border-color: color-mix(in srgb, var(--vscode-focusBorder) 40%, transparent);
    color: var(--vscode-editor-foreground);
  }
  
  #tab-bar button:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
  ```

  **Replace with:**
  ```css
  /* ═══════════════════════════════════════════════════
     TAB BAR — Preview / Source toggle
  ═══════════════════════════════════════════════════ */
  #tab-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-4);
    background: color-mix(in srgb, var(--vscode-editor-background) 88%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  /* ── Segmented pill toggle ─────────────────────── */
  .mode-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    background: color-mix(in srgb, var(--vscode-list-hoverBackground) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 70%, transparent);
    border-radius: 20px;
    padding: 2px;
  }
  
  .mode-toggle button {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: 3px var(--sp-3);
    border: none;
    border-radius: 16px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    font-family: var(--font-body);
    font-size: 0.8em;
    font-weight: 500;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition:
      background var(--dur-fast) var(--ease-snap),
      color var(--dur-fast) var(--ease-snap);
  }
  
  .mode-toggle button .tab-icon {
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity var(--dur-fast) var(--ease-snap);
  }
  
  .mode-toggle button:hover {
    background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    color: var(--vscode-editor-foreground);
  }
  
  .mode-toggle button:hover .tab-icon {
    opacity: 1;
  }
  
  .mode-toggle button[aria-selected="true"] {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  
  .mode-toggle button[aria-selected="true"] .tab-icon {
    opacity: 1;
  }
  
  .mode-toggle button:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
  ```

- [ ] **Step 2: Replace the save-btn CSS section**

  In `media/editor.css`, find the entire block from `/* SAVE BUTTON — inline in tab bar (right-aligned) */` through the closing `}` of `#save-btn:active` (currently lines ~804–865).

  **Find:**
  ```css
  /* ═══════════════════════════════════════════════════
     SAVE BUTTON — inline in tab bar (right-aligned)
  ═══════════════════════════════════════════════════ */
  #save-btn {
    /* Push to far right of the flex tab bar */
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    /* Use descriptionForeground so icon is subtle when saved */
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    position: relative;
    transition:
      opacity var(--dur-mid) var(--ease-snap),
      background var(--dur-fast) var(--ease-snap),
      color var(--dur-fast) var(--ease-snap);
  }
  
  /* Ensure the inline SVG fills with the button's text color */
  #save-btn svg {
    display: block;
    fill: currentColor;
    flex-shrink: 0;
  }
  
  #save-btn.unsaved {
    opacity: 1;
    pointer-events: auto;
    color: var(--vscode-editor-foreground);
  }
  
  /* Unsaved dot indicator */
  #save-btn.unsaved::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--vscode-notificationsWarningIcon-foreground, var(--vscode-focusBorder));
  }
  
  #save-btn:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-editor-foreground);
    opacity: 1;
    pointer-events: auto;
  }
  
  #save-btn:active {
    background: var(--vscode-list-activeSelectionBackground);
  }
  ```

  **Replace with:**
  ```css
  /* ═══════════════════════════════════════════════════
     SYNC STATUS INDICATOR — always visible, right-aligned
  ═══════════════════════════════════════════════════ */
  @keyframes spin-ring {
    to { transform: rotate(360deg); }
  }
  
  #sync-btn {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px var(--sp-3);
    border: 1px solid transparent;
    border-radius: 20px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    font-family: var(--font-body);
    font-size: 0.78em;
    font-weight: 500;
    letter-spacing: 0.03em;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background var(--dur-fast) var(--ease-snap),
      color var(--dur-fast) var(--ease-snap),
      border-color var(--dur-fast) var(--ease-snap);
  }
  
  #sync-btn:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-editor-foreground);
    border-color: color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
  }
  
  #sync-btn:active {
    background: var(--vscode-list-activeSelectionBackground);
  }
  
  #sync-btn:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
  
  /* Icons: only one shown at a time based on data-state */
  #sync-btn .icon-check,
  #sync-btn .icon-spin {
    display: none;
    flex-shrink: 0;
  }
  
  #sync-btn[data-state="saved"] .icon-check {
    display: block;
  }
  
  #sync-btn[data-state="syncing"] .icon-spin {
    display: block;
    animation: spin-ring 600ms linear infinite;
    color: var(--vscode-focusBorder);
  }
  
  #sync-btn[data-state="syncing"] {
    color: var(--vscode-focusBorder);
  }
  ```

- [ ] **Step 3: Build the webview bundle**

  ```bash
  npm run build:webview
  ```

  Expected: exits 0, no errors. (`media/editor.js` updated)

- [ ] **Step 4: Commit**

  ```bash
  git add media/editor.css media/editor.js media/editor.js.map
  git commit -m "feat: redesign toolbar CSS — pill toggle + sync indicator + spin animation"
  ```

---

## Task 3: Update JS sync state logic in editor.ts

**Files:**
- Modify: `media/editor.ts`

- [ ] **Step 1: Replace the save indicator and save button sections**

  In `media/editor.ts`, find the two sections `// ─── Save indicator` and `// ─── Save button` (lines ~34–65) and replace them entirely:

  **Find:**
  ```typescript
  // ─── Save indicator ─────────────────────────────────
  
  function markUnsaved(): void {
    if (hasUnsavedChanges) return;
    hasUnsavedChanges = true;
    saveBtn.classList.add('unsaved');
    saveBtn.title = 'Unsaved changes — click to save (Ctrl+S)';
  }
  
  function markSaved(): void {
    hasUnsavedChanges = false;
    saveBtn.classList.remove('unsaved');
    saveBtn.title = 'Save (Ctrl+S)';
  }
  
  function triggerSave(): void {
    vscode.postMessage({ type: 'save' });
    markSaved();
  }
  
  function postEdit(content: string): void {
    vscode.postMessage({ type: 'edit', content, version: localVersion });
    markUnsaved();
  }
  
  // ─── Save button ────────────────────────────────────
  
  // The button lives in the HTML tab bar; we just wire it up here.
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  // Stroke-based floppy disk icon: more reliable than fill in VS Code webviews
  saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="12" height="12" rx="1.5"/><rect x="5.5" y="2" width="5" height="4"/><circle cx="8" cy="10" r="2"/></svg>';
  saveBtn.addEventListener('click', triggerSave);
  ```

  **Replace with:**
  ```typescript
  // ─── Sync indicator ─────────────────────────────────
  
  const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
  const syncText = syncBtn.querySelector('.sync-text') as HTMLSpanElement;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  
  function markSyncing(): void {
    if (syncTimer) clearTimeout(syncTimer);
    syncBtn.dataset['state'] = 'syncing';
    syncBtn.title = 'Syncing… (Ctrl+S)';
    syncText.textContent = 'Syncing\u2026';
    syncTimer = setTimeout(markSaved, 700);
  }
  
  function markSaved(): void {
    syncTimer = null;
    syncBtn.dataset['state'] = 'saved';
    syncBtn.title = 'Saved (Ctrl+S)';
    syncText.textContent = 'Saved';
  }
  
  function triggerSave(): void {
    vscode.postMessage({ type: 'save' });
    markSyncing();
  }
  
  function postEdit(content: string): void {
    vscode.postMessage({ type: 'edit', content, version: localVersion });
    markSyncing();
  }
  
  syncBtn.addEventListener('click', triggerSave);
  ```

- [ ] **Step 2: Remove the `hasUnsavedChanges` variable declaration**

  In `media/editor.ts`, find and remove this line (currently around line 32):

  ```typescript
  let hasUnsavedChanges = false;
  ```

- [ ] **Step 3: Build the webview bundle**

  ```bash
  npm run build:webview
  ```

  Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Compile extension host and run all unit tests**

  ```bash
  npm run compile && npm run test:unit
  ```

  Expected: All tests pass, coverage thresholds met (80% lines/functions, 75% branches).

- [ ] **Step 5: Commit**

  ```bash
  git add media/editor.ts media/editor.js media/editor.js.map
  git commit -m "feat: replace save button with always-visible sync indicator"
  ```

---

## Task 4: Smoke test in the Extension Development Host

**Files:** None — manual verification only.

- [ ] **Step 1: Press F5 in VS Code** to launch the Extension Development Host.

- [ ] **Step 2: Open any `.md` file** — the toolbar should show:
  - Pill toggle on the left with eye icon + "Preview" (active/filled) and code icon + "Source"
  - "✓ Saved" indicator on the right, always visible, muted color

- [ ] **Step 3: Type something** — within 150ms the indicator should switch to spinning arc + "Syncing…" in accent color, then after ~700ms flip back to "✓ Saved".

- [ ] **Step 4: Press Ctrl+S** — same syncing animation fires.

- [ ] **Step 5: Click the Source tab** — pill active state moves to "Source" button; "✓ Saved" indicator stays visible on the right.

- [ ] **Step 6: Final commit if any last-minute fixes were needed** — otherwise no further action required.
