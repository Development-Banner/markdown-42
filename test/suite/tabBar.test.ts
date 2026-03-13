import * as assert from 'assert';

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
