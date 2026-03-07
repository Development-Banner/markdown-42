# Real-World Markdown Test Suite

This file tests every markdown pattern found in real developer documentation,
READMEs, changelogs, PRDs, and wiki exports.

---

## 1. GFM Pipe Tables

### Basic table

| Name       | Role         | Status   |
|------------|--------------|----------|
| Alice      | Developer    | Active   |
| Bob        | Designer     | On leave |
| Charlie    | PM           | Active   |

### Table with alignment

| Left         | Center       | Right    |
|:-------------|:------------:|---------:|
| left text    | centered     | 42       |
| more left    | also center  | 1,000    |

### Table with inline formatting

| Feature       | Status      | Notes                        |
|---------------|-------------|------------------------------|
| **Bold**      | ✅ Done     | See [issue #42](#)           |
| *Italic*      | 🚧 WIP      | Blocked on `auth` module     |
| `inline code` | ❌ Blocked  | Requires Node ≥ 18           |

---

## 2. Space-Aligned Tables (Plain Text Format)

### Two-column

Metric              Target
------------------- --------
Install count       100K
Daily active users  20%
User rating         4.5+
Feature requests    <50/month

### Three-column

Name                Role            Department
------------------- --------------- ----------
Alice Johnson       Lead Developer  Engineering
Bob Smith           UX Designer     Design
Charlie Brown       Product Manager Product

### Four-column metrics table

Component       P50     P95     P99
--------------- ------- ------- -------
API latency     45ms    120ms   340ms
DB query        8ms     35ms    90ms
Page load       0.8s    2.1s    4.2s
Bundle parse    82ms    150ms   210ms

---

## 3. Nested Lists

### Mixed nesting

1. First item
   - Bullet under numbered
   - Another bullet
     - Deep nested
     - Even deeper
       - Maximum depth
2. Second item
   1. Numbered sub-item
   2. Another numbered sub-item
3. Third item

### Definition-style list (using bold)

- **API**: Application Programming Interface — a contract between systems
- **SDK**: Software Development Kit — libraries and tools for building on a platform
- **CLI**: Command Line Interface — text-based interaction with a program

---

## 4. Code Blocks

### TypeScript with complex syntax

```typescript
interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

class UserRepository implements Repository<User> {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return row ? UserMapper.fromRow(row) : null;
  }
}
```

### Shell with comments

```bash
#!/usr/bin/env bash
set -euo pipefail

# Install dependencies
npm ci --prefer-offline

# Run tests with coverage
npx nyc --reporter=lcov npm test

# Build for production
NODE_ENV=production npm run build
```

### JSON configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Plain code (no language)

```
error: failed to push some refs to 'origin'
hint: Updates were rejected because the remote contains work that you do
hint: not have locally. Integrate the remote changes (e.g.
hint: 'git pull ...') before pushing again.
```

---

## 5. Blockquotes

### Single level

> The best way to predict the future is to invent it.
> — Alan Kay

### Multi-paragraph blockquote

> **Note**: This section describes deprecated behaviour.
>
> The `legacyMode` flag was removed in v2.0. If you are upgrading from v1.x,
> please read the [migration guide](#) before proceeding.
>
> All existing configuration files will need to be updated.

### Nested blockquote (email thread style)

> Alice wrote:
>
> > Bob wrote:
> >
> > > The original question was: why does this fail on Windows?
> >
> > Because the path separator is `\` not `/`.
>
> Right — we should use `path.join()` everywhere.

---

## 6. Task Lists

### Project checklist

- [x] Set up repository
- [x] Configure TypeScript
- [x] Add ESLint and Prettier
- [ ] Write unit tests
- [ ] Set up CI/CD pipeline
- [ ] Publish to npm
- [ ] Write documentation

### Nested tasks

- [x] Phase 1 — Core
  - [x] Parser
  - [x] Renderer
  - [ ] Editor
- [ ] Phase 2 — Features
  - [ ] Table editor
  - [ ] Image paste
  - [ ] Syntax highlighting

---

## 7. Emphasis and Formatting

Normal text, **bold text**, *italic text*, ***bold italic***, ~~strikethrough~~.

Inline `code`, [link text](https://example.com), and a bare autolink: https://github.com

Escaped characters: \*not italic\*, \`not code\`, \[not a link\]

Long line: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

---

## 8. Horizontal Rules

Three types:

---

***

___

---

## 9. Headings — Full Range

# H1 — Document Title
## H2 — Major Section
### H3 — Subsection
#### H4 — Sub-subsection
##### H5 — Minor heading
###### H6 — Smallest heading

---

## 10. Special Characters and Unicode

### Symbols

Copyright ©, trademark ™, registered ®, degree °, plus-minus ±, section §

### Arrows

← → ↑ ↓ ↔ ⇐ ⇒ ⇑ ⇓

### Math-like

E = mc², f(x) = x² + 2x + 1, √2 ≈ 1.414, π ≈ 3.14159, ∞

### Emoji (shortcodes)

:thumbsup: :heart: :fire: :rocket: :warning: :white_check_mark: :x:

### Emoji (unicode direct)

👋 🚀 ✅ ❌ 📝 🔧 💡 🎯

---

## 11. Links and References

### External links

- [GitHub](https://github.com)
- [npm registry](https://www.npmjs.com)
- [VS Code docs](https://code.visualstudio.com/docs)

### Autolinks

Visit https://example.com or email hello@example.com

---

## 12. Mixed Complex Content

### API Endpoint Documentation

#### `POST /api/v1/documents`

Creates a new document in the workspace.

**Request body:**

```json
{
  "title": "My Document",
  "content": "# Hello\n\nWorld",
  "tags": ["work", "draft"]
}
```

**Response:**

| Field      | Type     | Description                     |
|------------|----------|---------------------------------|
| `id`       | `string` | UUID of the created document    |
| `title`    | `string` | Document title                  |
| `created`  | `string` | ISO 8601 timestamp              |
| `version`  | `number` | Always `1` for new documents    |

**Error codes:**

Status    Meaning
--------- ---------------------------
400       Invalid request body
401       Not authenticated
403       Insufficient permissions
409       Document title already exists
500       Internal server error

---

## 13. Changelog Format (Keep a Changelog style)

### [2.1.0] — 2026-02-14

#### Added
- New `--watch` flag for incremental builds
- Support for `tsconfig.json` path aliases

#### Changed
- Improved error messages for missing dependencies
- Updated `esbuild` to `0.27.3` (security update)

#### Fixed
- **Critical**: Fixed race condition in file watcher on Windows
- Fixed incorrect line numbers in source maps

#### Deprecated
- `legacyBuild()` function — use `build()` instead

---

## 14. Consecutive Elements (No Blank Lines Between)

This paragraph is immediately followed by a list:
- item one
- item two

This paragraph is immediately followed by a blockquote:
> The blockquote content here

---

## 15. Empty Sections

### This heading has no content below it

### This one does

A paragraph follows this heading.

---

## 16. Long Code Identifiers

`veryLongVariableNameThatExceedsNormalLineWidth_withSuffix_andMoreContent_toTestWrapping`

```typescript
export type VeryLongTypeName_WithComplexGenerics<T extends BaseEntity & Serializable, K extends keyof T> = {
  [P in K]: T[P] extends string ? `validated_${T[P]}` : never;
};
```

---

*End of real-world test suite.*
