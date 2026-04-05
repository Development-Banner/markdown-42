# Markdown42 Comprehensive Test Fixtures
<!--
  Self-documenting fixture for automated testing.
  Every case is wrapped in TEST markers: TEST: category/id ... /TEST (using HTML comment syntax).
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