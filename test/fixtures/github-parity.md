# GFM Parity Test

All constructs that must render identically to GitHub Flavored Markdown.

## Task Lists

- [x] Done item
- [ ] Pending item
- [x] Another done item

## Tables

| Syntax    | Description | Notes     |
|-----------|-------------|-----------|
| Header    | Title       | Important |
| Paragraph | Text        | Also key  |

## Strikethrough

~~This text is struck through~~

## Autolinks

Visit https://example.com or email user@example.com

## Code Blocks

```javascript
function hello(name) {
  return `Hello, ${name}!`;
}
```

```python
def hello(name):
    return f"Hello, {name}!"
```

```
No language specified block
```

## Nested Lists

1. First item
   - Nested bullet
   - Another nested
2. Second item
   1. Nested numbered
   2. Another numbered

## Blockquotes

> Single blockquote
>
> Multi-paragraph blockquote
>
> > Nested blockquote

## Emphasis Combinations

**Bold text**
*Italic text*
***Bold and italic***
`inline code`

## Horizontal Rules

---

***

___

## HTML (should be stripped for security)

<script>alert('xss')</script>
<b>This bold tag should be stripped</b>

## Emojis

:thumbsup: :heart: :fire: :wave: :rocket:

## Headings

# H1
## H2
### H3
#### H4
##### H5
###### H6
