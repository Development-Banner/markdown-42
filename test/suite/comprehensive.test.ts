import * as assert from 'assert';
import * as path from 'path';
import { loadTestCases, getTestCase, assertStripped } from '../helpers/fixtures';
import { renderMarkdown, preprocessSpaceTables } from '../../src/parser/markdownParser';

// out-test/test/suite/ → ../../../ → project root (markdown-42/) → test/fixtures/comprehensive.md
const FIXTURE = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures', 'comprehensive.md');

suite('comprehensive fixture', () => {
  let cases: Map<string, string>;

  suiteSetup(() => {
    cases = loadTestCases(FIXTURE);
  });

  // ── Fixture sanity ────────────────────────────────────────────

  suite('fixture sanity', () => {
    test('loads exactly 86 test cases', () => {
      assert.strictEqual(cases.size, 86, `Expected 86 cases, got ${cases.size}`);
    });

    const requiredIds = [
      'block/heading-h1', 'block/heading-h6',
      'block/blockquote-nested-3', 'block/list-nested-mixed',
      'block/table-aligned', 'block/tasklist-mixed',
      'inline/bold-italic', 'inline/link-mailto', 'inline/emoji-tada',
      'combinations/bold-italic-in-blockquote-list',
      'combinations/deep-nesting-3-levels',
      'plain-text-table/two-column', 'plain-text-table/three-column',
      'plain-text-table/single-column-no-convert',
      'sanitization/script-tag', 'sanitization/javascript-link',
    ];

    for (const id of requiredIds) {
      test(`has required case "${id}"`, () => {
        assert.ok(cases.has(id), `Missing case: ${id}`);
      });
    }
  });

  // ── Block Elements ────────────────────────────────────────────

  suite('block elements', () => {
    test('h1 renders as <h1>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/heading-h1'));
      assert.ok(html.includes('<h1>'), html);
    });

    test('h6 renders as <h6>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/heading-h6'));
      assert.ok(html.includes('<h6>'), html);
    });

    test('multi-paragraph renders two <p> tags', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/paragraph-multi'));
      const count = (html.match(/<p>/g) ?? []).length;
      assert.ok(count >= 2, `Expected >= 2 <p> tags, got ${count} in: ${html}`);
    });

    test('nested blockquote 3-deep renders nested <blockquote>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/blockquote-nested-3'));
      const count = (html.match(/<blockquote>/g) ?? []).length;
      assert.ok(count >= 3, `Expected >= 3 blockquotes, got ${count} in: ${html}`);
    });

    test('nested mixed list renders <ul> and <ol>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/list-nested-mixed'));
      assert.ok(html.includes('<ul>'), html);
      assert.ok(html.includes('<ol>'), html);
    });

    test('fenced code with lang gets language class', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/code-fenced-with-lang'));
      assert.ok(html.includes('language-typescript'), html);
    });

    test('hr-dashes renders <hr>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/hr-dashes'));
      assert.ok(html.includes('<hr'), html);
    });

    test('hr-asterisks renders <hr>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/hr-asterisks'));
      assert.ok(html.includes('<hr'), html);
    });

    test('hr-underscores renders <hr>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/hr-underscores'));
      assert.ok(html.includes('<hr'), html);
    });

    test('aligned table renders <th> and <td>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/table-aligned'));
      // Renderer may produce <th> or <th style="..."> for aligned columns
      assert.ok(html.includes('<th'), html);
      assert.ok(html.includes('<td'), html);
    });

    test('mixed tasklist renders checkboxes', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/tasklist-mixed'));
      assert.ok(html.includes('type="checkbox"'), html);
    });
  });

  // ── Inline Elements ───────────────────────────────────────────

  suite('inline elements', () => {
    test('bold asterisk renders <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/bold-asterisk'));
      assert.ok(html.includes('<strong>'), html);
    });

    test('bold underscore renders <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/bold-underscore'));
      assert.ok(html.includes('<strong>'), html);
    });

    test('italic asterisk renders <em>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/italic-asterisk'));
      assert.ok(html.includes('<em>'), html);
    });

    test('italic underscore renders <em>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/italic-underscore'));
      assert.ok(html.includes('<em>'), html);
    });

    test('bold-italic renders <strong> and <em>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/bold-italic'));
      assert.ok(html.includes('<strong>') && html.includes('<em>'), html);
    });

    test('inline code renders <code>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/code'));
      assert.ok(html.includes('<code>'), html);
    });

    test('link sets data-href and href="#"', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/link-https'));
      assert.ok(html.includes('data-href="https://example.com"'), html);
      assert.ok(html.includes('href="#"'), html);
    });

    test('mailto link sets data-href with mailto:', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/link-mailto'));
      assert.ok(html.includes('data-href="mailto:'), html);
    });

    test('image renders <img>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/image'));
      assert.ok(html.includes('<img'), html);
    });

    test('strikethrough renders <s> or <del>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/strikethrough'));
      assert.ok(html.includes('<s>') || html.includes('<del>'), html);
    });

    test('emoji :smile: renders unicode emoji', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/emoji-smile'));
      // markdown-it-emoji renders to the actual Unicode character
      assert.ok(
        html.includes('😄') || html.includes('😊') || html.includes('🙂'),
        `Expected smile emoji in: ${html}`
      );
    });

    test('emoji :tada: renders 🎉', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/emoji-tada'));
      assert.ok(html.includes('🎉'), html);
    });

    test('hard line break renders <br>', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/hard-line-break'));
      assert.ok(html.includes('<br'), `Expected <br> for trailing-space hard break in: ${html}`);
    });
  });

  // ── Combinations ──────────────────────────────────────────────

  suite('combinations', () => {
    test('bold in heading: <h2> and <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-in-heading'));
      assert.ok(html.match(/<h2[> ]/), html);
      assert.ok(html.includes('<strong>'), html);
    });

    test('code in heading: heading tag and <code>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/code-in-heading'));
      assert.ok(html.match(/<h[1-6][> ]/), html);
      assert.ok(html.includes('<code>'), html);
    });

    test('bold in blockquote: <blockquote> and <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-in-blockquote'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<strong>'), html);
    });

    test('list in blockquote: <blockquote> and <ul>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/list-in-blockquote'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<ul>'), html);
    });

    test('blockquote in list: <li> and <blockquote>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/blockquote-in-list'));
      assert.ok(html.includes('<li>'), html);
      assert.ok(html.includes('<blockquote>'), html);
    });

    test('bold-italic in blockquote list: <blockquote>, <strong>, <em>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-italic-in-blockquote-list'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<strong>'), html);
      assert.ok(html.includes('<em>'), html);
    });

    test('bold in table cell: <table> and <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-in-table-cell'));
      assert.ok(html.includes('<table>'), html);
      assert.ok(html.includes('<strong>'), html);
    });

    test('code in table cell: <table> and <code>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/code-in-table-cell'));
      assert.ok(html.includes('<table>'), html);
      assert.ok(html.includes('<code>'), html);
    });

    test('blockquote containing table: <blockquote> and <table>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/blockquote-containing-table'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<table>'), html);
    });

    test('blockquote containing code block: <blockquote> and <pre>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/blockquote-containing-code-block'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<pre>'), html);
    });

    test('deep nesting 3 levels: blockquote + list + inline', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/deep-nesting-3-levels'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<li>'), html);
      assert.ok(
        html.includes('<strong>') || html.includes('<em>') || html.includes('<code>'),
        html
      );
    });

    test('all-emphasis-inline: bold, italic, code, strikethrough all present', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/all-emphasis-inline'));
      assert.ok(html.includes('<strong>'), html);
      assert.ok(html.includes('<em>'), html);
      assert.ok(html.includes('<code>'), html);
      assert.ok(html.includes('<s>') || html.includes('<del>'), html);
    });
  });

  // ── Plain-text Tables ─────────────────────────────────────────

  suite('plain-text tables', () => {
    test('two-column converts to <table>', () => {
      const md = getTestCase(cases, 'plain-text-table/two-column');
      const processed = preprocessSpaceTables(md);
      assert.ok(processed.includes('|'), `Expected GFM pipe in: ${processed}`);
      // renderMarkdown() calls preprocessSpaceTables() internally — passing raw md is correct
      const html = renderMarkdown(md);
      assert.ok(html.includes('<table>'), html);
    });

    test('three-column converts to <table> with Alice row', () => {
      const html = renderMarkdown(getTestCase(cases, 'plain-text-table/three-column'));
      assert.ok(html.includes('<table>'), html);
      assert.ok(html.includes('Alice'), html);
    });

    test('pipe in cell is escaped before conversion', () => {
      const md = getTestCase(cases, 'plain-text-table/with-pipe-in-cell');
      const processed = preprocessSpaceTables(md);
      assert.ok(processed.includes('foo\\|bar'), `Expected escaped pipe in: ${processed}`);
    });

    test('single-column does NOT convert to table', () => {
      const md = getTestCase(cases, 'plain-text-table/single-column-no-convert');
      const processed = preprocessSpaceTables(md);
      const tableLines = processed.split('\n').filter(l => l.startsWith('|'));
      assert.strictEqual(tableLines.length, 0, `Unexpectedly converted: ${processed}`);
    });

    test('adjacent tables both convert — two <table> elements', () => {
      const html = renderMarkdown(getTestCase(cases, 'plain-text-table/adjacent-tables'));
      const count = (html.match(/<table>/g) ?? []).length;
      assert.strictEqual(count, 2, `Expected 2 tables, got ${count} in: ${html}`);
    });

    test('data rows stop at blank line — standalone text not in table', () => {
      const md = getTestCase(cases, 'plain-text-table/data-row-stops-at-blank');
      const processed = preprocessSpaceTables(md);
      const tableLines = processed.split('\n').filter(l => l.startsWith('|'));
      assert.ok(
        !tableLines.some(l => l.includes('Not a table row')),
        `Standalone text ended up in table: ${processed}`
      );
    });
  });

  // ── Sanitization ──────────────────────────────────────────────

  suite('sanitization', () => {
    test('strips <script> tag', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/script-tag'));
      assertStripped(html, '<script>');
    });

    test('strips raw <b> tag (html:false)', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-bold-tag'));
      assertStripped(html, '<b>');
    });

    test('strips <img> with onerror', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-img-tag'));
      assertStripped(html, '<img');
      // onerror must not appear as a live executable HTML attribute
      const hasLiveOnerror = /<[a-z][^>]* onerror=/i.test(html);
      assert.ok(!hasLiveOnerror, `Found live onerror attribute in: ${html}`);
    });

    test('strips <iframe>', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-iframe'));
      assertStripped(html, '<iframe');
    });

    test('does not render javascript: as executable href', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/javascript-link'));
      assertStripped(html, 'href="javascript:');
    });

    test('does not render vbscript: scheme', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/vbscript-link'));
      // The renderer either strips the link or renders it as escaped text.
      // In either case, it must NOT produce a live href with vbscript:.
      assertStripped(html, 'href="vbscript:');
    });

    test('does not render data:text/html as executable href', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/data-html-link'));
      assertStripped(html, 'href="data:');
    });

    test('strips onclick from <a>', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/onclick-attribute'));
      // html:false mode renders the raw <a> tag as escaped text; "onclick" may appear as
      // literal visible text but must NOT appear as a live executable HTML attribute
      // (i.e. not inside an unescaped HTML tag like <tag onclick=...>).
      const hasLiveOnclick = /<[a-z][^>]* onclick=/i.test(html);
      assert.ok(!hasLiveOnclick, `Found live onclick attribute in: ${html}`);
    });

    test('strips <svg onload>', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/svg-onload'));
      assertStripped(html, '<svg');
    });

    test('strips <script> nested inside blockquote', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-html-in-blockquote'));
      assertStripped(html, '<script>');
    });
  });
});
