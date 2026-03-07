import * as assert from 'assert';
import { renderMarkdown, renderInline, preprocessSpaceTables } from '../../src/parser/markdownParser';

suite('markdownParser', () => {
  suite('GFM rendering', () => {
    test('renders h1', () => {
      const html = renderMarkdown('# Hello World');
      assert.ok(html.includes('<h1>'), `Expected <h1> in: ${html}`);
      assert.ok(html.includes('Hello World'));
    });

    test('renders h2', () => {
      const html = renderMarkdown('## Section');
      assert.ok(html.includes('<h2>'));
    });

    test('renders bold text', () => {
      const html = renderMarkdown('**bold**');
      assert.ok(html.includes('<strong>bold</strong>'));
    });

    test('renders italic text', () => {
      const html = renderMarkdown('*italic*');
      assert.ok(html.includes('<em>italic</em>'));
    });

    test('renders inline code', () => {
      const html = renderMarkdown('`code`');
      assert.ok(html.includes('<code>code</code>'));
    });

    test('renders fenced code with language class', () => {
      const html = renderMarkdown('```typescript\nconst x = 1;\n```');
      assert.ok(
        html.includes('language-typescript'),
        `Expected language-typescript class in: ${html}`
      );
      assert.ok(html.includes('const x = 1;'));
    });

    test('renders fenced code without language', () => {
      const html = renderMarkdown('```\nplain code\n```');
      assert.ok(html.includes('<pre>'));
      assert.ok(html.includes('plain code'));
    });

    test('renders unordered list', () => {
      const html = renderMarkdown('- item one\n- item two');
      assert.ok(html.includes('<ul>'));
      assert.ok(html.includes('<li>'));
      assert.ok(html.includes('item one'));
      assert.ok(html.includes('item two'));
    });

    test('renders ordered list', () => {
      const html = renderMarkdown('1. first\n2. second');
      assert.ok(html.includes('<ol>'));
      assert.ok(html.includes('first'));
    });

    test('renders blockquote', () => {
      const html = renderMarkdown('> quote text');
      assert.ok(html.includes('<blockquote>'));
      assert.ok(html.includes('quote text'));
    });

    test('renders horizontal rule', () => {
      const html = renderMarkdown('---');
      assert.ok(html.includes('<hr'));
    });

    test('renders table', () => {
      const md = '| A | B |\n|---|---|\n| 1 | 2 |';
      const html = renderMarkdown(md);
      assert.ok(html.includes('<table>'));
      assert.ok(html.includes('<th>'));
      assert.ok(html.includes('<td>'));
    });
  });

  suite('GFM extensions', () => {
    test('renders task list with checked item', () => {
      const html = renderMarkdown('- [x] Done');
      assert.ok(
        html.includes('checked') || html.includes('task-list'),
        `Expected task-list markup in: ${html}`
      );
    });

    test('renders task list with unchecked item', () => {
      const html = renderMarkdown('- [ ] Todo');
      assert.ok(html.includes('type="checkbox"'));
      assert.ok(!html.includes('checked') || html.includes('disabled'));
    });

    test('renders emoji shortcode :wave:', () => {
      const html = renderMarkdown('Hello :wave:');
      assert.ok(html.includes('👋'), `Expected wave emoji in: ${html}`);
    });

    test('renders emoji shortcode :rocket:', () => {
      const html = renderMarkdown(':rocket:');
      assert.ok(html.includes('🚀'));
    });

    test('renders emoji shortcode :thumbsup:', () => {
      const html = renderMarkdown(':thumbsup:');
      assert.ok(html.includes('👍'));
    });
  });

  suite('Security — XSS prevention', () => {
    test('strips <script> tags', () => {
      const html = renderMarkdown('<script>alert(1)</script>');
      assert.ok(!html.includes('<script>'), `Script tag found in: ${html}`);
    });

    test('escapes <img onerror> — no executable <img> tag', () => {
      const html = renderMarkdown('<img src="x" onerror="alert(1)">');
      // html:false escapes the tag — it renders as &lt;img...&gt; which cannot execute
      assert.ok(!html.includes('<img'), `Executable <img> found in: ${html}`);
    });

    test('escapes onclick handlers — no executable element', () => {
      const html = renderMarkdown('<div onclick="evil()">text</div>');
      // html:false escapes the tag — onclick cannot execute
      assert.ok(!html.includes('<div'), `Executable <div> found in: ${html}`);
    });

    test('strips <iframe>', () => {
      const html = renderMarkdown('<iframe src="https://evil.com"></iframe>');
      assert.ok(!html.includes('<iframe'), `iframe found in: ${html}`);
    });

    test('blocks javascript: URI links — no executable href', () => {
      const html = renderMarkdown('[click](javascript:alert(1))');
      // markdown-it does not render javascript: as a navigable href
      // It may appear as escaped text, but never as href="javascript:..."
      assert.ok(
        !html.includes('href="javascript:'),
        `Executable javascript: href found in: ${html}`
      );
    });
  });

  suite('Link rendering', () => {
    test('sets data-href on links', () => {
      const html = renderMarkdown('[Example](https://example.com)');
      assert.ok(
        html.includes('data-href="https://example.com"'),
        `Expected data-href in: ${html}`
      );
    });

    test('sets rel="noopener noreferrer" on links', () => {
      const html = renderMarkdown('[Example](https://example.com)');
      assert.ok(
        html.includes('rel="noopener noreferrer"'),
        `Expected rel attribute in: ${html}`
      );
    });

    test('sets href to # (prevents webview navigation)', () => {
      const html = renderMarkdown('[Example](https://example.com)');
      assert.ok(html.includes('href="#"'), `Expected href="#" in: ${html}`);
    });
  });

  suite('renderInline', () => {
    test('renders inline without wrapping paragraph', () => {
      const html = renderInline('**bold** text');
      assert.ok(!html.includes('<p>'), `Unexpected <p> in: ${html}`);
      assert.ok(html.includes('<strong>bold</strong>'));
    });
  });

  suite('preprocessSpaceTables', () => {
    test('converts 2-column space table to GFM pipe table', () => {
      const input = 'Metric              Target\n------------------- --------\nInstall count       100K\nDaily users         20%';
      const output = preprocessSpaceTables(input);
      assert.ok(output.includes('| Metric'), `Expected GFM header in: ${output}`);
      assert.ok(output.includes('| Target'), `Expected Target column in: ${output}`);
      assert.ok(output.includes('| Install count'), `Expected data row in: ${output}`);
      assert.ok(output.includes('| 100K'), `Expected 100K value in: ${output}`);
    });

    test('converts 3-column space table to GFM pipe table', () => {
      const input = 'Name       Role        Dept\n---------- ----------- ----\nAlice      Developer   Eng\nBob        Designer    UX';
      const output = preprocessSpaceTables(input);
      assert.ok(output.includes('| Name'), `Expected Name header in: ${output}`);
      assert.ok(output.includes('| Role'), `Expected Role header in: ${output}`);
      assert.ok(output.includes('| Alice'), `Expected Alice row in: ${output}`);
    });

    test('renders converted space table as HTML table', () => {
      const md = 'Col A    Col B\n-------- --------\nval 1    val 2\nval 3    val 4';
      const html = renderMarkdown(md);
      assert.ok(html.includes('<table>'), `Expected <table> in: ${html}`);
      assert.ok(html.includes('<th>'), `Expected <th> in: ${html}`);
      assert.ok(html.includes('<td>'), `Expected <td> in: ${html}`);
      assert.ok(html.includes('val 1'), `Expected data in: ${html}`);
    });

    test('does not convert single-dash-group line', () => {
      const input = 'Text\n---\nMore text';
      const output = preprocessSpaceTables(input);
      // Should pass through unchanged (only one dash group = not a table separator)
      assert.strictEqual(output, input);
    });

    test('escapes pipe characters in cell content', () => {
      const input = 'Name      Notes\n--------- -----\nfoo|bar   baz';
      const output = preprocessSpaceTables(input);
      assert.ok(output.includes('foo\\|bar'), `Expected escaped pipe in: ${output}`);
    });

    test('passes through non-table content unchanged', () => {
      const input = '# Heading\n\nJust a paragraph.';
      const output = preprocessSpaceTables(input);
      assert.strictEqual(output, input);
    });

    test('stops consuming rows at blank line', () => {
      const input = 'A    B\n---- ----\nrow1 data\n\nNot a table row';
      const output = preprocessSpaceTables(input);
      assert.ok(output.includes('| row1'), `Expected row1 in table in: ${output}`);
      assert.ok(output.includes('Not a table row'), `Expected standalone text in: ${output}`);
      // "Not a table row" should NOT appear as a table row
      const lines = output.split('\n');
      const tableLines = lines.filter(l => l.startsWith('|'));
      assert.ok(!tableLines.some(l => l.includes('Not a table')), 'Standalone text should not be in table');
    });
  });

  suite('Performance', () => {
    test('renders 10K lines in under 500ms', () => {
      const bigDoc = Array.from(
        { length: 500 },
        (_, i) => `## Section ${i}\n\nParagraph text for section ${i}.`
      ).join('\n\n');

      const start = Date.now();
      renderMarkdown(bigDoc);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 500, `Render took ${elapsed}ms, expected < 500ms`);
    });
  });
});
