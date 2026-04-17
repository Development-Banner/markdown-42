// LCS-based block diff engine for accurate diff highlighting.
// Replaces naive positional comparison with proper sequence alignment.

export interface GapMarker {
  /** Insert the gap marker after this block index (-1 = before first block) */
  afterIndex: number;
  /** How many blocks are missing here */
  count: number;
}

export interface SideDiff {
  changed: number[];
  added: number[];
  removed: number[];
  gaps: GapMarker[];
}

export interface BlockDiffResult {
  original: SideDiff;
  modified: SideDiff;
}

/**
 * Compute the longest common subsequence table.
 * Returns a 2D array where lcs[i][j] = length of LCS of a[0..i-1] and b[0..j-1].
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/**
 * Backtrack through the LCS table to produce a diff sequence.
 * Each entry is: 'match' (in both), 'remove' (only in a), or 'add' (only in b).
 */
interface DiffOp {
  type: 'match' | 'remove' | 'add';
  origIndex: number | undefined;
  modIndex: number | undefined;
}

function backtrack(dp: number[][], a: string[], b: string[]): DiffOp[] {
  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'match', origIndex: i - 1, modIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'add', origIndex: undefined, modIndex: j - 1 });
      j--;
    } else {
      ops.push({ type: 'remove', origIndex: i - 1, modIndex: undefined });
      i--;
    }
  }

  return ops.reverse();
}

/**
 * Refine raw diff ops: consecutive remove+add pairs of equal length
 * are reclassified as 'changed' pairs rather than separate remove/add.
 * This produces "modified" highlighting instead of "deleted + inserted".
 */
interface RefinedOp {
  type: 'match' | 'remove' | 'add' | 'changed';
  origIndex: number | undefined;
  modIndex: number | undefined;
}

function refineOps(ops: DiffOp[]): RefinedOp[] {
  const refined: RefinedOp[] = [];

  let i = 0;
  while (i < ops.length) {
    // Collect a contiguous run of removes followed by adds
    const removeStart = i;
    while (i < ops.length && ops[i].type === 'remove') i++;
    const removeEnd = i;

    const addStart = i;
    while (i < ops.length && ops[i].type === 'add') i++;
    const addEnd = i;

    const removeCount = removeEnd - removeStart;
    const addCount = addEnd - addStart;

    if (removeCount > 0 && addCount > 0) {
      // Pair up as many as possible as 'changed'
      const paired = Math.min(removeCount, addCount);
      for (let p = 0; p < paired; p++) {
        refined.push({
          type: 'changed',
          origIndex: ops[removeStart + p].origIndex,
          modIndex: ops[addStart + p].modIndex,
        });
      }
      // Leftover removes
      for (let p = paired; p < removeCount; p++) {
        refined.push({ type: 'remove', origIndex: ops[removeStart + p].origIndex, modIndex: undefined });
      }
      // Leftover adds
      for (let p = paired; p < addCount; p++) {
        refined.push({ type: 'add', origIndex: undefined, modIndex: ops[addStart + p].modIndex });
      }
    } else {
      // No pairing possible — emit as-is
      for (let r = removeStart; r < removeEnd; r++) {
        refined.push({ type: 'remove', origIndex: ops[r].origIndex, modIndex: undefined });
      }
      for (let a = addStart; a < addEnd; a++) {
        refined.push({ type: 'add', origIndex: undefined, modIndex: ops[a].modIndex });
      }
    }

    // Process any match ops
    if (i < ops.length && ops[i].type === 'match') {
      refined.push({ ...ops[i] });
      i++;
    }
  }

  return refined;
}

/**
 * Compute block-level diff between original and modified block lists.
 * Uses LCS to align blocks, then refines consecutive remove/add pairs
 * into 'changed' ops for better UX.
 */
export function computeBlockDiff(origBlocks: string[], modBlocks: string[]): BlockDiffResult {
  const dp = lcsTable(origBlocks, modBlocks);
  const rawOps = backtrack(dp, origBlocks, modBlocks);
  const ops = refineOps(rawOps);

  const origResult: SideDiff = { changed: [], added: [], removed: [], gaps: [] };
  const modResult: SideDiff = { changed: [], added: [], removed: [], gaps: [] };

  // Track gap markers: consecutive adds → gap on original side, consecutive removes → gap on modified side
  let pendingOrigGap = 0;   // blocks added in modified (missing from original)
  let lastOrigIndex = -1;
  let pendingModGap = 0;    // blocks removed from original (missing from modified)
  let lastModIndex = -1;

  for (const op of ops) {
    switch (op.type) {
      case 'match':
        // Flush pending gaps
        if (pendingOrigGap > 0) {
          origResult.gaps.push({ afterIndex: lastOrigIndex, count: pendingOrigGap });
          pendingOrigGap = 0;
        }
        if (pendingModGap > 0) {
          modResult.gaps.push({ afterIndex: lastModIndex, count: pendingModGap });
          pendingModGap = 0;
        }
        lastOrigIndex = op.origIndex!;
        lastModIndex = op.modIndex!;
        break;

      case 'changed':
        // Flush pending gaps
        if (pendingOrigGap > 0) {
          origResult.gaps.push({ afterIndex: lastOrigIndex, count: pendingOrigGap });
          pendingOrigGap = 0;
        }
        if (pendingModGap > 0) {
          modResult.gaps.push({ afterIndex: lastModIndex, count: pendingModGap });
          pendingModGap = 0;
        }
        origResult.changed.push(op.origIndex!);
        modResult.changed.push(op.modIndex!);
        lastOrigIndex = op.origIndex!;
        lastModIndex = op.modIndex!;
        break;

      case 'remove':
        origResult.removed.push(op.origIndex!);
        lastOrigIndex = op.origIndex!;
        pendingModGap++;
        break;

      case 'add':
        modResult.added.push(op.modIndex!);
        lastModIndex = op.modIndex!;
        pendingOrigGap++;
        break;
    }
  }

  // Flush any trailing gaps
  if (pendingOrigGap > 0) {
    origResult.gaps.push({ afterIndex: lastOrigIndex, count: pendingOrigGap });
  }
  if (pendingModGap > 0) {
    modResult.gaps.push({ afterIndex: lastModIndex, count: pendingModGap });
  }

  return { original: origResult, modified: modResult };
}
