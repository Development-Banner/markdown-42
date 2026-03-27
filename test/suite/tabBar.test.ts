import * as assert from 'assert';
import * as sinon from 'sinon';

// Test the pure logic of updateTabBar without a live webview.
// We duck-type minimal DOM elements to avoid jsdom dependency.

interface FakeButton {
  ariaSelected: string | null;
  clicked: boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

function makeFakeButton(): FakeButton {
  const attrs: Record<string, string> = {};
  return {
    ariaSelected: null,
    clicked: false,
    setAttribute(name: string, value: string) { attrs[name] = value; },
    getAttribute(name: string) { return attrs[name] ?? null; },
  };
}

// Inline the updateTabBar logic (mirrors what editor.ts will export)
function updateTabBar(
  mode: 'preview' | 'source',
  previewTab: FakeButton,
  sourceTab: FakeButton
): void {
  previewTab.setAttribute('aria-selected', mode === 'preview' ? 'true' : 'false');
  sourceTab.setAttribute('aria-selected', mode === 'source' ? 'true' : 'false');
}

suite('tab bar logic', () => {
  test('updateTabBar preview: preview tab selected, source deselected', () => {
    const previewTab = makeFakeButton();
    const sourceTab = makeFakeButton();
    updateTabBar('preview', previewTab, sourceTab);
    assert.strictEqual(previewTab.getAttribute('aria-selected'), 'true');
    assert.strictEqual(sourceTab.getAttribute('aria-selected'), 'false');
  });

  test('updateTabBar source: source tab selected, preview deselected', () => {
    const previewTab = makeFakeButton();
    const sourceTab = makeFakeButton();
    updateTabBar('source', previewTab, sourceTab);
    assert.strictEqual(previewTab.getAttribute('aria-selected'), 'false');
    assert.strictEqual(sourceTab.getAttribute('aria-selected'), 'true');
  });

  test('updateTabBar is symmetric: switching back restores preview', () => {
    const previewTab = makeFakeButton();
    const sourceTab = makeFakeButton();
    updateTabBar('source', previewTab, sourceTab);
    updateTabBar('preview', previewTab, sourceTab);
    assert.strictEqual(previewTab.getAttribute('aria-selected'), 'true');
    assert.strictEqual(sourceTab.getAttribute('aria-selected'), 'false');
  });
});

// ─── switchMode visibility + scroll ──────────────────────────────────────────
//
// Inlines the visibility logic from editor.ts switchMode() so it can be tested
// in Node without acquireVsCodeApi. Pattern mirrors updateTabBar tests above.

interface FakePanel {
  hidden: boolean;
}

/**
 * Mirrors the visibility-setting logic inside editor.ts switchMode().
 * scrollTo is passed in so we can spy on it in tests.
 */
function switchModeVisibility(
  mode: 'preview' | 'source',
  sourceEditor: FakePanel,
  blocksContainer: FakePanel,
  scrollTo: (x: number, y: number) => void,
  scroll = true
): void {
  if (scroll) scrollTo(0, 0); // test stand-in for window.scrollTo(0,0) at the top of switchMode() in editor.ts
  if (mode === 'source') {
    sourceEditor.hidden = false;
    blocksContainer.hidden = true;
  } else {
    sourceEditor.hidden = true;
    blocksContainer.hidden = false;
  }
}

suite('switchMode visibility', () => {
  let scrollTo: sinon.SinonSpy;

  setup(() => {
    scrollTo = sinon.spy();
  });

  teardown(() => {
    sinon.restore();
  });

  test('switching to source: sourceEditor shown, blocksContainer hidden', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(sourceEditor.hidden, false);
    assert.strictEqual(blocksContainer.hidden, true);
  });

  test('switching to preview: sourceEditor hidden, blocksContainer shown', () => {
    const sourceEditor: FakePanel = { hidden: false };
    const blocksContainer: FakePanel = { hidden: true };
    switchModeVisibility('preview', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(blocksContainer.hidden, false);
  });

  test('toggling source then preview restores preview state', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo);
    switchModeVisibility('preview', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(blocksContainer.hidden, false);
  });

  test('scrollTo(0,0) is called on every mode switch', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo);
    switchModeVisibility('preview', sourceEditor, blocksContainer, scrollTo);
    assert.strictEqual(scrollTo.callCount, 2);
    assert.ok(scrollTo.alwaysCalledWithExactly(0, 0));
  });

  test('config-driven switch (scroll=false) does not call scrollTo', () => {
    const sourceEditor: FakePanel = { hidden: true };
    const blocksContainer: FakePanel = { hidden: false };
    switchModeVisibility('source', sourceEditor, blocksContainer, scrollTo, false);
    assert.strictEqual(scrollTo.callCount, 0);
    // visibility still changes even when scroll is suppressed
    assert.strictEqual(sourceEditor.hidden, false);
    assert.strictEqual(blocksContainer.hidden, true);
  });
});
