import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import * as emojiPlugin from 'markdown-it-emoji';

// Security: html is DISABLED — raw HTML in .md files is stripped.
// This prevents XSS when opening untrusted markdown files from disk.
const md: MarkdownIt = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: false,
  langPrefix: 'language-',
  linkify: true,
  typographer: true,
})
  .use(taskLists, { enabled: true, label: true, labelAfter: false })
  .use(emojiPlugin.full);

// Override link_open: add rel + data-href, set href="#" so webview never navigates.
const defaultLinkOpenRenderer =
  md.renderer.rules['link_open'] ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules['link_open'] = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  if (hrefIndex >= 0 && token.attrs) {
    const href = token.attrs[hrefIndex][1];
    token.attrSet('data-href', href);
    token.attrSet('href', '#');
  }
  token.attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAIN-TEXT TABLE PRE-PROCESSOR
//
// Many real-world markdown documents use space-aligned tables without pipes:
//
//   Column A        Column B        Column C
//   --------------- --------------- ---------------
//   value 1         value 2         value 3
//   value 4         value 5         value 6
//
// markdown-it only handles GFM pipe tables. This pre-processor detects the
// above pattern and converts it to standard GFM before rendering.
//
// Detection criteria:
//   1. A separator line consists ONLY of dashes (-) and spaces, has ≥2 groups
//      of 3+ dashes, and is preceded by a non-empty line (the header).
//   2. One or more data rows follow, with no blank lines, until a blank line
//      or end-of-input.
//
// Column boundaries are inferred from where each dash-group STARTS in the
// separator line. Text is sliced from those positions.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if `line` looks like a plain-text table separator. */
function isSeparatorLine(line: string): boolean {
  const trimmed = line.trimEnd();
  if (!/^[-\s]+$/.test(trimmed)) return false;
  const groups = trimmed.match(/-{2,}/g);
  return groups !== null && groups.length >= 2;
}

/**
 * Finds the start position of each dash-group in a separator line.
 * These become the left edges of each column.
 */
function parseColumnStarts(separator: string): number[] {
  const starts: number[] = [];
  let inDash = false;
  for (let i = 0; i < separator.length; i++) {
    if (separator[i] === '-' && !inDash) {
      starts.push(i);
      inDash = true;
    } else if (separator[i] === ' ') {
      inDash = false;
    }
  }
  return starts;
}

/**
 * Slices a line into columns based on the start positions from the separator.
 * The last column extends to end-of-line.
 */
function sliceColumns(line: string, starts: number[]): string[] {
  return starts.map((start, i) => {
    const end = starts[i + 1] ?? line.length;
    return line.slice(start, end).trim();
  });
}

/**
 * Escapes pipe characters inside cell content so they don't break GFM tables.
 */
function escapeCell(cell: string): string {
  return cell.replace(/\|/g, '\\|');
}

/**
 * Pre-processes a markdown string to convert plain-text aligned tables
 * into GFM pipe tables. Non-table content is passed through unchanged.
 */
export function preprocessSpaceTables(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = lines[i + 1] ?? '';

    // Look ahead: if the NEXT line is a separator, current line is the header.
    if (nextLine && isSeparatorLine(nextLine) && line.trim().length > 0) {
      const colStarts = parseColumnStarts(nextLine);

      // Need at least 2 columns to be a table
      if (colStarts.length >= 2) {
        const headerCells = sliceColumns(line, colStarts);

        // Validate: header cells should align reasonably with separator
        // (at least one cell must be non-empty)
        const hasContent = headerCells.some(c => c.length > 0);

        if (hasContent) {
          // Emit GFM header + separator
          output.push('| ' + headerCells.map(escapeCell).join(' | ') + ' |');
          output.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');

          i += 2; // skip header line + separator line

          // Consume data rows (stop at blank line or separator-only line)
          while (i < lines.length) {
            const dataLine = lines[i];
            if (dataLine.trim() === '') break;
            // Another separator means a multi-header table (rare) — stop
            if (isSeparatorLine(dataLine)) { i++; break; }

            const cells = sliceColumns(dataLine, colStarts);
            output.push('| ' + cells.map(escapeCell).join(' | ') + ' |');
            i++;
          }
          continue;
        }
      }
    }

    output.push(line);
    i++;
  }

  return output.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders markdown string to safe HTML.
 * Runs plain-text table pre-processing before markdown-it.
 * All raw HTML is stripped. Links are intercepted via data-href.
 */
export function renderMarkdown(markdown: string): string {
  return md.render(preprocessSpaceTables(markdown));
}

/**
 * Renders an inline markdown snippet (no wrapping <p> tag).
 */
export function renderInline(markdown: string): string {
  return md.renderInline(markdown);
}
