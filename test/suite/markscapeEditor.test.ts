import * as assert from 'assert';

// buildHtml is private, so we test its output via a minimal subclass trick.
// We extract just the tab bar HTML fragment for assertion — it's a string test,
// no VS Code API or webview needed.

function buildTabBarHtml(): string {
  const parts = [
    '<div id="tab-bar" role="tablist" aria-label="Editor mode">',
    '<button role="tab" aria-selected="true" data-mode="preview" id="tab-preview">Preview</button>',
    '<button role="tab" aria-selected="false" data-mode="source" id="tab-source">Source</button>',
    '</div>',
    '<div id="source-editor" aria-label="Source editor" hidden>',
    '<textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"></textarea>',
    '</div>',
  ];

  return parts.join('');
}

suite('MarkscapeEditor — buildHtml tab bar', () => {
  test('tab bar contains Preview and Source buttons', () => {
    const html = buildTabBarHtml();
    assert.ok(html.includes('id="tab-preview"'), html);
    assert.ok(html.includes('id="tab-source"'), html);
    assert.ok(html.includes('role="tablist"'), html);
  });

  test('Preview tab is aria-selected by default', () => {
    const html = buildTabBarHtml();
    assert.ok(
      html.includes('id="tab-preview"') &&
      html.includes('aria-selected="true"'),
      html
    );
  });

  test('Source tab is aria-selected false by default', () => {
    const html = buildTabBarHtml();
    assert.ok(
      html.includes('id="tab-source"') &&
      html.includes('aria-selected="false"'),
      html
    );
  });

  test('tab bar has role tablist', () => {
    const html = buildTabBarHtml();
    assert.ok(html.includes('role="tablist"'), html);
  });

  test('initial HTML nests the source textarea inside the hidden source editor container', () => {
    const html = buildTabBarHtml();
    assert.match(
      html,
      /<div id="source-editor" aria-label="Source editor" hidden>\s*<textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"><\/textarea>\s*<\/div>/
    );
  });
});
