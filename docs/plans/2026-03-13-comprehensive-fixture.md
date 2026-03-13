# Comprehensive Markdown Test Fixture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a self-documenting markdown fixture file with comment markers covering all markdown permutations, combinations, and sanitization cases, plus a helper that lets tests extract and assert on individual cases.

**Architecture:** A `test/helpers/fixtures.ts` helper parses `<!-- TEST: id -->…<!-- /TEST -->` markers from `test/fixtures/comprehensive.md` into a `Map<string, string>`. A smoke test suite (`test/suite/comprehensive.test.ts`) loads the fixture, renders each case via `renderMarkdown`, and asserts on the HTML output.

**Tech Stack:** TypeScript, Node.js `fs`, mocha TDD, Node.js `assert`, `renderMarkdown` / `preprocessSpaceTables` from `src/parser/markdownParser.ts`.

---

## Task 1: Create the fixture helper

**Files:**
- Create: `test/helpers/fixtures.ts`
- Create: `test/suite/fixtureHelper.test.ts`

### Step 1: Write the failing test

Create `test/suite/fixtureHelper.test.ts`:

```ts
import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { loadTestCases, getTestCase, assertStripped } from '../helpers/fixtures';

suite('fixture helper', () => {
  let tmpFile: string;

  setup(() => {
    tmpFile = path.join(os.tmpdir(), `md42-fixture-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, [
      '<!-- TEST: block/heading -->',
      '# Hello',
      '<!-- /TEST -->',
      '',
      '<!-- TEST: inline/bold -->',
      '**bold**',
      '<!-- /TEST -->',
    ].join('\n'));
  });

  teardown(() => {
    fs.unlinkSync(tmpFile);
  });

  test('loadTestCases returns map with all case IDs', () => {
    const cases = loadTestCases(tmpFile);
    assert.strictEqual(cases.size, 2);
    assert.ok(cases.has('block/heading'));
    assert.ok(cases.has('inline/bold'));
  });

  test('getTestCase returns trimmed markdown for valid ID', () => {
    const cases = loadTestCases(tmpFile);
    const content = getTestCase(cases, 'block/heading');
    assert.strictEqual(content, '# Hello');
  });

  test('getTestCase throws for unknown ID', () => {
    const cases = loadTestCases(tmpFile);
    assert.throws(
      () => getTestCase(cases, 'nonexistent/case'),
      /Test case not found: nonexistent\/case/
    );
  });

  test('assertStripped passes when forbidden string is absent', () => {
    assert.doesNotThrow(() => assertStripped('<p>hello</p>', '<script>'));
  });

  test('assertStripped throws when forbidden string is present', () => {
    assert.throws(
      () => assertStripped('<script>evil</script>', '<script>'),
      /Expected.*to be stripped/
    );
  });
});
```

### Step 2: Run to verify it fails

```bash
cd markdown-42
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/fixtureHelper.test.js" --timeout 10000
```

Expected: `Cannot find module '../helpers/fixtures'`

### Step 3: Implement the helper

Create `test/helpers/fixtures.ts`:

```ts
import * as fs from 'fs';

/**
 * Parses a fixture file containing <!-- TEST: id -->...<!-- /TEST --> blocks.
 * Returns a map of case ID → trimmed markdown content.
 */
export function loadTestCases(fixturePath: string): Map<string, string> {
  const content = fs.readFileSync(fixturePath, 'utf-8');
  const map = new Map<string, string>();
  const regex = /<!--\s*TEST:\s*([\w\-/]+)\s*-->([\s\S]*?)<!--\s*\/TEST\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    map.set(match[1].trim(), match[2].trim());
  }
  return map;
}

/**
 * Returns the markdown content for a case ID. Throws if not found.
 */
export function getTestCase(cases: Map<string, string>, id: string): string {
  const content = cases.get(id);
  if (content === undefined) {
    throw new Error(`Test case not found: ${id}`);
  }
  return content;
}

/**
 * Asserts that `forbidden` does not appear in `html`. Throws with a clear
 * message if it does, so tests fail descriptively.
 */
export function assertStripped(html: string, forbidden: string): void {
  if (html.includes(forbidden)) {
    throw new Error(
      `Expected "${forbidden}" to be stripped from output, but found it in:\n${html}`
    );
  }
}
```

### Step 4: Run to verify it passes

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/fixtureHelper.test.js" --timeout 10000
```

Expected: `5 passing`

### Step 5: Commit

```bash
git add test/helpers/fixtures.ts test/suite/fixtureHelper.test.ts
git commit -m "feat: add fixture helper for comment-marker test case extraction"
```

---

## Task 2: Create the comprehensive fixture file

**Files:**
- Create: `test/fixtures/comprehensive.md`

This is a data file — no TDD cycle. Write it in full, then verify with the smoke test in Task 3.

### Step 1: Create `test/fixtures/comprehensive.md`

The file must have exactly these sections and case IDs (the smoke test in Task 3 verifies their presence). Write each section in the order shown.

```markdown
# Markdown42 Comprehensive Test Fixture
<!--
  Self-documenting fixture for automated testing.
  Every case is wrapped in <!-- TEST: category/id --> ... <!-- /TEST --> markers.
  Use test/helpers/fixtures.ts to extract individual cases.
-->

---

## Block Elements

<!-- TEST: block/heading-h1 -->
# Heading Level 1
<!-- /TEST -->

<!-- TEST: block/heading-h2 -->
## Heading Level 2
<!-- /TEST -->

<!-- TEST: block/heading-h3 -->
### Heading Level 3
<!-- /TEST -->

<!-- TEST: block/heading-h4 -->
#### Heading Level 4
<!-- /TEST -->

<!-- TEST: block/heading-h5 -->
##### Heading Level 5
<!-- /TEST -->

<!-- TEST: block/heading-h6 -->
###### Heading Level 6
<!-- /TEST -->

<!-- TEST: block/paragraph-single -->
This is a single paragraph of text.
<!-- /TEST -->

<!-- TEST: block/paragraph-multi -->
First paragraph here.

Second paragraph here.
<!-- /TEST -->

<!-- TEST: block/blockquote-single -->
> This is a single-level blockquote.
<!-- /TEST -->

<!-- TEST: block/blockquote-nested-2 -->
> Outer quote.
>
> > Inner quote level 2.
<!-- /TEST -->

<!-- TEST: block/blockquote-nested-3 -->
> Level 1.
>
> > Level 2.
> >
> > > Level 3.
<!-- /TEST -->

<!-- TEST: block/list-unordered -->
- Alpha
- Beta
- Gamma
<!-- /TEST -->

<!-- TEST: block/list-ordered -->
1. First
2. Second
3. Third
<!-- /TEST -->

<!-- TEST: block/list-nested-mixed -->
- Top level
  1. Ordered sub-item one
  2. Ordered sub-item two
     - Deeply nested bullet
     - Another deep bullet
- Back to top
<!-- /TEST -->

<!-- TEST: block/code-fenced-no-lang -->
```
plain code block
no language tag
```
<!-- /TEST -->

<!-- TEST: block/code-fenced-with-lang -->
```typescript
const x: number = 42;
console.log(x);
```
<!-- /TEST -->

<!-- TEST: block/code-indented -->
    indented code line one
    indented code line two
<!-- /TEST -->

<!-- TEST: block/hr-dashes -->
---
<!-- /TEST -->

<!-- TEST: block/hr-asterisks -->
***
<!-- /TEST -->

<!-- TEST: block/hr-underscores -->
___
<!-- /TEST -->

<!-- TEST: block/table-basic -->
| Name  | Age |
|-------|-----|
| Alice | 30  |
| Bob   | 25  |
<!-- /TEST -->

<!-- TEST: block/table-aligned -->
| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |
| L2   | C2     | R2    |
<!-- /TEST -->

<!-- TEST: block/tasklist-unchecked -->
- [ ] Buy milk
- [ ] Write tests
- [ ] Ship it
<!-- /TEST -->

<!-- TEST: block/tasklist-checked -->
- [x] Done one
- [x] Done two
<!-- /TEST -->

<!-- TEST: block/tasklist-mixed -->
- [x] Completed item
- [ ] Pending item
- [x] Another done
<!-- /TEST -->

---

## Inline Elements

<!-- TEST: inline/bold-asterisk -->
**bold with asterisks**
<!-- /TEST -->

<!-- TEST: inline/bold-underscore -->
__bold with underscores__
<!-- /TEST -->

<!-- TEST: inline/italic-asterisk -->
*italic with asterisk*
<!-- /TEST -->

<!-- TEST: inline/italic-underscore -->
_italic with underscore_
<!-- /TEST -->

<!-- TEST: inline/bold-italic -->
***bold and italic together***
<!-- /TEST -->

<!-- TEST: inline/code -->
`inline code`
<!-- /TEST -->

<!-- TEST: inline/code-with-backtick -->
`` code `with` backtick ``
<!-- /TEST -->

<!-- TEST: inline/link-https -->
[HTTPS Link](https://example.com)
<!-- /TEST -->

<!-- TEST: inline/link-http -->
[HTTP Link](http://example.com)
<!-- /TEST -->

<!-- TEST: inline/link-mailto -->
[Email](mailto:test@example.com)
<!-- /TEST -->

<!-- TEST: inline/link-relative -->
[Relative](./other-file.md)
<!-- /TEST -->

<!-- TEST: inline/image -->
![Alt text](https://example.com/image.png)
<!-- /TEST -->

<!-- TEST: inline/strikethrough -->
~~struck through~~
<!-- /TEST -->

<!-- TEST: inline/emoji-smile -->
:smile:
<!-- /TEST -->

<!-- TEST: inline/emoji-tada -->
:tada:
<!-- /TEST -->

<!-- TEST: inline/hard-line-break -->
Line one with trailing spaces
Line two starts here
<!-- /TEST -->

---

## Combinations

<!-- TEST: combinations/bold-in-heading -->
## This heading has **bold** inside
<!-- /TEST -->

<!-- TEST: combinations/italic-in-heading -->
### This heading has *italic* inside
<!-- /TEST -->

<!-- TEST: combinations/code-in-heading -->
## Heading with `code` inside
<!-- /TEST -->

<!-- TEST: combinations/emoji-in-heading -->
## Heading with :rocket: emoji
<!-- /TEST -->

<!-- TEST: combinations/bold-in-blockquote -->
> This blockquote has **bold** text inside.
<!-- /TEST -->

<!-- TEST: combinations/italic-in-blockquote -->
> This blockquote has *italic* text inside.
<!-- /TEST -->

<!-- TEST: combinations/code-in-blockquote -->
> This blockquote has `inline code` inside.
<!-- /TEST -->

<!-- TEST: combinations/link-in-blockquote -->
> This blockquote has a [link](https://example.com) inside.
<!-- /TEST -->

<!-- TEST: combinations/bold-in-list-item -->
- List item with **bold** text
- Another item
<!-- /TEST -->

<!-- TEST: combinations/code-in-list-item -->
- List item with `code` here
- Regular item
<!-- /TEST -->

<!-- TEST: combinations/link-in-list-item -->
- See [the docs](https://example.com) for details
<!-- /TEST -->

<!-- TEST: combinations/emoji-in-list-item -->
- Item with :thumbsup: emoji
<!-- /TEST -->

<!-- TEST: combinations/bold-in-table-cell -->
| Feature | Status |
|---------|--------|
| Auth    | **Done** |
| API     | *In progress* |
<!-- /TEST -->

<!-- TEST: combinations/code-in-table-cell -->
| Method | Signature |
|--------|-----------|
| render | `renderMarkdown(md: string)` |
<!-- /TEST -->

<!-- TEST: combinations/link-in-table-cell -->
| Name  | Docs |
|-------|------|
| Alice | [profile](https://example.com) |
<!-- /TEST -->

<!-- TEST: combinations/bold-in-tasklist -->
- [x] **Critical** task done
- [ ] *Optional* task pending
<!-- /TEST -->

<!-- TEST: combinations/emoji-in-tasklist -->
- [x] Deploy :rocket:
- [ ] Celebrate :tada:
<!-- /TEST -->

<!-- TEST: combinations/list-in-blockquote -->
> - Item one inside blockquote
> - Item two inside blockquote
> - Item three inside blockquote
<!-- /TEST -->

<!-- TEST: combinations/blockquote-in-list -->
- First list item

  > A blockquote nested inside a list item.

- Second list item
<!-- /TEST -->

<!-- TEST: combinations/bold-italic-in-blockquote-list -->
> - **Bold** item in blockquote list
> - *Italic* item in blockquote list
> - ***Bold and italic*** in blockquote list
<!-- /TEST -->

<!-- TEST: combinations/nested-list-with-inline -->
- Top item with *italic*
  - Sub-item with **bold**
    - Deep item with `code` and [link](https://example.com)
<!-- /TEST -->

<!-- TEST: combinations/blockquote-containing-table -->
> | Col A | Col B |
> |-------|-------|
> | val 1 | val 2 |
<!-- /TEST -->

<!-- TEST: combinations/blockquote-containing-code-block -->
> ```typescript
> const nested = true;
> ```
<!-- /TEST -->

<!-- TEST: combinations/bold-link-in-table-cell -->
| Resource | Link |
|----------|------|
| Docs | [**Read the docs**](https://example.com) |
<!-- /TEST -->

<!-- TEST: combinations/strikethrough-in-list -->
- ~~Deprecated feature~~
- Current feature
<!-- /TEST -->

<!-- TEST: combinations/strikethrough-bold-combo -->
~~**strikethrough bold**~~
<!-- /TEST -->

<!-- TEST: combinations/all-emphasis-inline -->
Plain **bold** *italic* ***bold-italic*** ~~strike~~ `code` :wave: text.
<!-- /TEST -->

<!-- TEST: combinations/ordered-list-in-blockquote -->
> 1. First ordered in quote
> 2. Second ordered in quote
> 3. Third ordered in quote
<!-- /TEST -->

<!-- TEST: combinations/deep-nesting-3-levels -->
> - **Top** level item
>   - *Second* level item
>     - `Third` level with [link](https://example.com)
<!-- /TEST -->

---

## Plain-text Tables

<!-- TEST: plain-text-table/two-column -->
Column A        Column B
--------------- ---------------
value one       value two
value three     value four
<!-- /TEST -->

<!-- TEST: plain-text-table/three-column -->
Name       Role        Department
---------- ----------- ----------
Alice      Developer   Engineering
Bob        Designer    UX
<!-- /TEST -->

<!-- TEST: plain-text-table/with-pipe-in-cell -->
Name      Notes
--------- -----
foo|bar   baz
<!-- /TEST -->

<!-- TEST: plain-text-table/single-column-no-convert -->
Header
------
This should not become a table because there is only one dash group.
<!-- /TEST -->

<!-- TEST: plain-text-table/adjacent-tables -->
Col A    Col B
-------- --------
row1a    row1b

Col X    Col Y
-------- --------
row2a    row2b
<!-- /TEST -->

<!-- TEST: plain-text-table/data-row-stops-at-blank -->
A    B
---- ----
row1 data

Not a table row
<!-- /TEST -->

---

## Sanitization

<!-- TEST: sanitization/script-tag -->
<script>alert('xss')</script>
<!-- /TEST -->

<!-- TEST: sanitization/raw-bold-tag -->
<b>raw bold tag</b>
<!-- /TEST -->

<!-- TEST: sanitization/raw-img-tag -->
<img src="x" onerror="alert(1)">
<!-- /TEST -->

<!-- TEST: sanitization/raw-iframe -->
<iframe src="https://evil.com"></iframe>
<!-- /TEST -->

<!-- TEST: sanitization/javascript-link -->
[click me](javascript:alert(1))
<!-- /TEST -->

<!-- TEST: sanitization/vbscript-link -->
[click me](vbscript:msgbox(1))
<!-- /TEST -->

<!-- TEST: sanitization/data-html-link -->
[click me](data:text/html,<script>alert(1)</script>)
<!-- /TEST -->

<!-- TEST: sanitization/onclick-attribute -->
<a href="https://example.com" onclick="evil()">link</a>
<!-- /TEST -->

<!-- TEST: sanitization/svg-onload -->
<svg onload="alert(1)"></svg>
<!-- /TEST -->

<!-- TEST: sanitization/raw-html-in-blockquote -->
> <script>alert('in blockquote')</script>
<!-- /TEST -->
```

### Step 2: Verify the file was created

```bash
ls test/fixtures/comprehensive.md
```

Expected: file exists.

---

## Task 3: Create the smoke test suite

**Files:**
- Create: `test/suite/comprehensive.test.ts`

### Step 1: Write the failing test

Create `test/suite/comprehensive.test.ts`:

```ts
import * as assert from 'assert';
import * as path from 'path';
import { loadTestCases, getTestCase, assertStripped } from '../helpers/fixtures';
import { renderMarkdown, preprocessSpaceTables } from '../../src/parser/markdownParser';

const FIXTURE = path.join(__dirname, '..', '..', '..', 'test', 'fixtures', 'comprehensive.md');

suite('comprehensive fixture', () => {
  let cases: Map<string, string>;

  suiteSetup(() => {
    cases = loadTestCases(FIXTURE);
  });

  // ── Fixture sanity ────────────────────────────────────────────

  suite('fixture sanity', () => {
    test('loads at least 60 test cases', () => {
      assert.ok(cases.size >= 60, `Expected >= 60 cases, got ${cases.size}`);
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
      assert.strictEqual(count, 2, `Expected 2 <p> tags, got ${count} in: ${html}`);
    });

    test('nested blockquote 3-deep renders nested <blockquote>', () => {
      const html = renderMarkdown(getTestCase(cases, 'block/blockquote-nested-3'));
      const count = (html.match(/<blockquote>/g) ?? []).length;
      assert.ok(count >= 3, `Expected >= 3 blockquotes, got ${count} in: ${html}`);
    });

    test('nested mixed list renders <ul>, <ol>, and nested <li>', () => {
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
      assert.ok(html.includes('<th>') || html.includes('<th '), html);
      assert.ok(html.includes('<td>'), html);
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

    test('bold-italic renders <strong><em> or <em><strong>', () => {
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
      assert.ok(html.includes('😄') || html.includes('&#x1F604;') || html.includes('😊'), html);
    });

    test('emoji :tada: renders unicode emoji', () => {
      const html = renderMarkdown(getTestCase(cases, 'inline/emoji-tada'));
      assert.ok(html.includes('🎉'), html);
    });
  });

  // ── Combinations ──────────────────────────────────────────────

  suite('combinations', () => {
    test('bold in heading: contains <h2> and <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-in-heading'));
      assert.ok(html.includes('<h2>') || html.includes('<h2 '), html);
      assert.ok(html.includes('<strong>'), html);
    });

    test('code in heading: contains heading tag and <code>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/code-in-heading'));
      assert.ok(html.match(/<h[1-6]/), html);
      assert.ok(html.includes('<code>'), html);
    });

    test('bold in blockquote: contains <blockquote> and <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-in-blockquote'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<strong>'), html);
    });

    test('list in blockquote: contains <blockquote> and <ul>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/list-in-blockquote'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<ul>'), html);
    });

    test('blockquote in list: contains <li> and <blockquote>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/blockquote-in-list'));
      assert.ok(html.includes('<li>'), html);
      assert.ok(html.includes('<blockquote>'), html);
    });

    test('bold-italic in blockquote list: all three tags present', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-italic-in-blockquote-list'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<strong>'), html);
      assert.ok(html.includes('<em>'), html);
    });

    test('bold in table cell: contains <table> and <strong>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/bold-in-table-cell'));
      assert.ok(html.includes('<table>'), html);
      assert.ok(html.includes('<strong>'), html);
    });

    test('code in table cell: contains <table> and <code>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/code-in-table-cell'));
      assert.ok(html.includes('<table>'), html);
      assert.ok(html.includes('<code>'), html);
    });

    test('blockquote containing table: contains <blockquote> and <table>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/blockquote-containing-table'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<table>'), html);
    });

    test('blockquote containing code block: contains <blockquote> and <pre>', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/blockquote-containing-code-block'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<pre>'), html);
    });

    test('deep nesting 3 levels: blockquote + list + inline elements', () => {
      const html = renderMarkdown(getTestCase(cases, 'combinations/deep-nesting-3-levels'));
      assert.ok(html.includes('<blockquote>'), html);
      assert.ok(html.includes('<li>'), html);
      assert.ok(html.includes('<strong>') || html.includes('<em>') || html.includes('<code>'), html);
    });

    test('all-emphasis-inline: bold, italic, code, strike all present', () => {
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
      assert.ok(processed.includes('|'), `Expected GFM table in: ${processed}`);
      const html = renderMarkdown(md);
      assert.ok(html.includes('<table>'), html);
    });

    test('three-column converts to <table>', () => {
      const html = renderMarkdown(getTestCase(cases, 'plain-text-table/three-column'));
      assert.ok(html.includes('<table>'), html);
      assert.ok(html.includes('Alice'), html);
    });

    test('pipe in cell content is escaped before conversion', () => {
      const md = getTestCase(cases, 'plain-text-table/with-pipe-in-cell');
      const processed = preprocessSpaceTables(md);
      assert.ok(processed.includes('foo\\|bar'), `Expected escaped pipe in: ${processed}`);
    });

    test('single-column does NOT convert (only one dash group)', () => {
      const md = getTestCase(cases, 'plain-text-table/single-column-no-convert');
      const processed = preprocessSpaceTables(md);
      // Should not contain a GFM pipe table header
      const lines = processed.split('\n').filter(l => l.startsWith('|'));
      assert.strictEqual(lines.length, 0, `Unexpectedly converted: ${processed}`);
    });

    test('adjacent tables both convert', () => {
      const html = renderMarkdown(getTestCase(cases, 'plain-text-table/adjacent-tables'));
      const tableCount = (html.match(/<table>/g) ?? []).length;
      assert.strictEqual(tableCount, 2, `Expected 2 tables, got ${tableCount} in: ${html}`);
    });

    test('data rows stop at blank line', () => {
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

    test('strips raw <b> tag', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-bold-tag'));
      assertStripped(html, '<b>');
    });

    test('strips <img> with onerror', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-img-tag'));
      assertStripped(html, '<img');
    });

    test('strips <iframe>', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/raw-iframe'));
      assertStripped(html, '<iframe');
    });

    test('does not render javascript: as executable href', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/javascript-link'));
      assertStripped(html, 'href="javascript:');
    });

    test('does not render vbscript: link', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/vbscript-link'));
      assertStripped(html, 'vbscript:');
    });

    test('strips onclick attribute from <a>', () => {
      const html = renderMarkdown(getTestCase(cases, 'sanitization/onclick-attribute'));
      assertStripped(html, 'onclick');
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
```

### Step 2: Run to verify it fails

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/comprehensive.test.js" --timeout 10000
```

Expected: Multiple failures — missing cases, wrong counts, etc. (before or after fixture exists, this confirms the test drives the fixture shape.)

### Step 3: Run against the fixture (should now pass)

```bash
npm run compile:test && npx mocha --ui tdd "out-test/test/suite/comprehensive.test.js" --timeout 10000
```

Expected: All tests pass. If any fail, inspect the fixture content for that specific case ID and correct it.

### Step 4: Run the full unit test suite to check for regressions

```bash
npm run test:unit
```

Expected: All tests pass including pre-existing suites.

### Step 5: Commit

```bash
git add test/fixtures/comprehensive.md test/suite/comprehensive.test.ts
git commit -m "feat: add comprehensive markdown fixture and smoke test suite"
```

---

## Final check

```bash
npm run lint && npm run test:unit
```

Expected: No lint errors, all tests pass.
