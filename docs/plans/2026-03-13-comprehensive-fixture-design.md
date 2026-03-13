# Comprehensive Markdown Test Fixture — Design

**Date:** 2026-03-13
**Status:** Approved

---

## Problem

The existing fixtures in `test/fixtures/` (`simple.md`, `github-parity.md`, `large.md`, `real-world.md`) are holistic documents used as end-to-end inputs. There is no fixture that covers individual markdown permutations and combinations at a granular level suitable for targeted automated assertions.

---

## Goal

Create a single comprehensive fixture file that covers every markdown element supported by Markdown42 — individually, in combination, and at multiple nesting depths — plus intentionally-invalid cases to verify sanitization. Every case must be programmatically addressable.

---

## Decisions

- **Automated testing** (not manual visual review)
- **Both valid and invalid cases** — rendering correctness + sanitization verification
- **Self-documenting** — cases are identifiable by machine and human
- **Deep combinations** — multi-level nesting (e.g. bold+italic in a list inside a blockquote)
- **Single file with HTML comment markers** (Option B)

---

## File Location

```
test/fixtures/comprehensive.md
```

---

## Marker Convention

Every test case is wrapped in HTML comment markers:

```
<!-- TEST: <category>/<case-id> -->
...markdown content...
<!-- /TEST -->
```

- Category is kebab-case (matches the `## Section` heading)
- Case ID is kebab-case and unique within the file
- Example: `<!-- TEST: combinations/bold-italic-in-blockquote-list -->`

The file is also organized under top-level `## Category` headings for human readability.

---

## Section Breakdown

### 1. Block Elements (~20 cases)
- Headings h1–h6 (one case per level)
- Paragraph, multi-paragraph
- Blockquote: single, nested 2-deep, nested 3-deep
- Unordered list, ordered list, nested mixed (3 levels)
- Fenced code block: no language tag, with language tag
- Indented code block
- Horizontal rule: `---`, `***`, `___`
- GFM pipe table: basic, with column alignment
- Task list: all unchecked, all checked, mixed

### 2. Inline Elements (~15 cases)
- Bold: `**text**` and `__text__` variants
- Italic: `*text*` and `_text_` variants
- Bold + italic: `***text***`
- Inline code: basic, with a literal backtick inside
- Link: http, https, mailto, relative path
- Image: with alt text
- Strikethrough: `~~text~~`
- Emoji: `:smile:`, `:tada:`
- Hard line break (trailing two spaces)

### 3. Combinations (~30 cases)
- Each inline element (bold, italic, bold+italic, code, link, emoji) inside each block container (heading, blockquote, list item, table cell, task list) — 1 level deep
- Multi-level nesting:
  - Blockquote → list → bold+italic text
  - List → blockquote → GFM table
  - Table cell → bold link
  - Blockquote → fenced code block
  - Ordered list → unordered sub-list → italic + strikethrough

### 4. Plain-text Tables (~6 cases)
Exercises the custom space-aligned table pre-processor in `src/parser/markdownParser.ts`:
- 2-column basic
- 3-column with data rows
- Cell content containing pipe characters (must be escaped)
- Single-column (must NOT be converted — fewer than 2 dash groups)
- Two adjacent plain-text tables separated by a blank line

### 5. Sanitization (~10 cases)
Cases where the extension must strip or block content:
- Raw `<script>` tag (stripped)
- Raw `<b>`, `<i>` inline HTML (stripped)
- Raw `<img>` tag (stripped)
- `javascript:` link scheme (blocked)
- `vbscript:` link scheme (blocked)
- `data:text/html` link scheme (blocked)
- `<a>` with `onclick` attribute (stripped)
- Raw HTML nested inside a blockquote (stripped)
- XSS via `<svg onload=...>` (stripped)

---

## Test Helper API

A small helper (new file `test/helpers/fixtures.ts`) exposes:

```ts
// Parse the fixture file into a map of caseId → markdownContent
loadTestCases(fixturePath: string): Map<string, string>

// Retrieve a single case
getTestCase(cases: Map<string, string>, id: string): string

// Assert a forbidden string does not appear in rendered HTML
assertStripped(html: string, forbidden: string): void
```

`loadTestCases` reads the file once and splits on `<!-- TEST: ... -->` / `<!-- /TEST -->` markers using a single regex pass.

---

## Out of Scope

- Creating new test suite files (`.test.ts`) that consume the fixture — that is a separate task
- E2E / Playwright tests
- Performance / large-document benchmarks

---

## Implementation Steps

See the implementation plan (to be created by the writing-plans skill).
