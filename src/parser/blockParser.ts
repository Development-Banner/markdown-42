export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'fence'
  | 'table'
  | 'list'
  | 'blockquote'
  | 'hr'
  | 'html'
  | 'blank';

export interface Block {
  index: number;
  raw: string;
  startLine: number;
  type: BlockType;
}

// Regex patterns used for block type detection
const HEADING_RE = /^#{1,6} /;
const FENCE_START_RE = /^(`{3,}|~{3,})/;
const TABLE_ROW_RE = /^\|/;
const LIST_RE = /^(\s*[-*+] |\s*\d+\. )/;
const BLOCKQUOTE_RE = /^> /;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
// Space-aligned table: second line is all dashes+spaces with 2+ dash groups
const SPACE_TABLE_SEP_RE = /^[-\s]+$/;

function isSpaceAlignedTable(raw: string): boolean {
  const lines = raw.split('\n');
  if (lines.length < 2) return false;
  const sep = lines[1];
  if (!SPACE_TABLE_SEP_RE.test(sep)) return false;
  const groups = sep.match(/-{2,}/g);
  return groups !== null && groups.length >= 2;
}

function detectType(raw: string): BlockType {
  const first = raw.trimStart();
  if (HEADING_RE.test(first)) return 'heading';
  if (FENCE_START_RE.test(first)) return 'fence';
  if (TABLE_ROW_RE.test(first)) return 'table';
  if (isSpaceAlignedTable(raw)) return 'table';
  if (LIST_RE.test(first)) return 'list';
  if (BLOCKQUOTE_RE.test(first)) return 'blockquote';
  if (HR_RE.test(first.trimEnd())) return 'hr';
  return 'paragraph';
}

/**
 * Splits a markdown document into logical Block units.
 *
 * Rules:
 * - Fenced code blocks (``` or ~~~) are never split regardless of blank lines inside.
 * - Tables are kept as a single block.
 * - Everything else splits on double-newline boundaries.
 */
export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let currentLines: string[] = [];
  let currentStartLine = 0;
  let inFence = false;
  let fenceMarker = '';
  let blockIndex = 0;

  function flushBlock(endedAtLine: number): void {
    if (currentLines.length === 0) return;
    const raw = currentLines.join('\n');
    // Don't emit pure-blank blocks between content
    if (raw.trim() === '') {
      currentLines = [];
      return;
    }
    blocks.push({
      index: blockIndex++,
      raw,
      startLine: currentStartLine,
      type: detectType(raw),
    });
    currentLines = [];
    currentStartLine = endedAtLine + 1;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fence toggle detection
    const fenceMatch = FENCE_START_RE.exec(line.trimStart());
    if (fenceMatch && !inFence) {
      inFence = true;
      fenceMarker = fenceMatch[1];
      currentLines.push(line);
      continue;
    }
    if (inFence) {
      currentLines.push(line);
      // Closing fence: same or longer marker, alone on the line
      if (line.trimStart().startsWith(fenceMarker) &&
          line.trim().split('').every(c => c === fenceMarker[0])) {
        inFence = false;
        fenceMarker = '';
        // Don't flush here — fenced block continues until next blank or EOF
      }
      continue;
    }

    // Table continuation: keep consecutive table rows in one block
    if (TABLE_ROW_RE.test(line) && currentLines.length > 0 &&
        TABLE_ROW_RE.test(currentLines[currentLines.length - 1])) {
      currentLines.push(line);
      continue;
    }

    // Blank line = block boundary
    if (line.trim() === '') {
      flushBlock(i - 1);
      currentStartLine = i + 1;
      continue;
    }

    if (currentLines.length === 0) {
      currentStartLine = i;
    }
    currentLines.push(line);
  }

  // Flush remaining content
  flushBlock(lines.length - 1);

  return blocks;
}

/**
 * Reconstructs the full markdown document from (possibly modified) blocks.
 * Preserves double-newline separation between blocks.
 */
export function serializeBlocks(blocks: Block[]): string {
  if (blocks.length === 0) return '';
  return blocks.map(b => b.raw).join('\n\n');
}
