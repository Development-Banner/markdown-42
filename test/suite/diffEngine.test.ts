import { computeBlockDiff } from '../../src/editor/diffEngine';
import * as assert from 'assert';

suite('diffEngine — computeBlockDiff', () => {
  test('identical blocks produce no diffs or gaps', () => {
    const result = computeBlockDiff(
      ['# Hello', 'Paragraph one', 'Paragraph two'],
      ['# Hello', 'Paragraph one', 'Paragraph two']
    );
    assert.deepStrictEqual(result.original.changed, []);
    assert.deepStrictEqual(result.original.added, []);
    assert.deepStrictEqual(result.original.removed, []);
    assert.deepStrictEqual(result.original.gaps, []);
    assert.deepStrictEqual(result.modified.changed, []);
    assert.deepStrictEqual(result.modified.added, []);
    assert.deepStrictEqual(result.modified.removed, []);
    assert.deepStrictEqual(result.modified.gaps, []);
  });

  test('single block modified in place', () => {
    const result = computeBlockDiff(
      ['# Hello', 'Old paragraph', 'Footer'],
      ['# Hello', 'New paragraph', 'Footer']
    );
    assert.deepStrictEqual(result.original.changed, [1]);
    assert.deepStrictEqual(result.modified.changed, [1]);
    assert.deepStrictEqual(result.original.gaps, []);
    assert.deepStrictEqual(result.modified.gaps, []);
    assert.deepStrictEqual(result.original.added, []);
    assert.deepStrictEqual(result.modified.added, []);
    assert.deepStrictEqual(result.original.removed, []);
    assert.deepStrictEqual(result.modified.removed, []);
  });

  test('block inserted in the middle', () => {
    const result = computeBlockDiff(
      ['# Hello', 'Footer'],
      ['# Hello', 'New block', 'Footer']
    );
    // Original side: no changes, but should have a gap where block was added
    assert.deepStrictEqual(result.original.changed, []);
    assert.deepStrictEqual(result.original.removed, []);
    assert.strictEqual(result.original.gaps.length, 1);
    assert.strictEqual(result.original.gaps[0].count, 1);

    // Modified side: block 1 is added
    assert.deepStrictEqual(result.modified.added, [1]);
    assert.deepStrictEqual(result.modified.changed, []);
    assert.deepStrictEqual(result.modified.gaps, []);
  });

  test('block removed from the middle', () => {
    const result = computeBlockDiff(
      ['# Hello', 'Middle block', 'Footer'],
      ['# Hello', 'Footer']
    );
    // Original side: block 1 is removed
    assert.deepStrictEqual(result.original.removed, [1]);
    assert.deepStrictEqual(result.original.changed, []);
    assert.deepStrictEqual(result.original.gaps, []);

    // Modified side: gap marker showing 1 block removed
    assert.deepStrictEqual(result.modified.changed, []);
    assert.deepStrictEqual(result.modified.added, []);
    assert.strictEqual(result.modified.gaps.length, 1);
    assert.strictEqual(result.modified.gaps[0].count, 1);
  });

  test('multiple blocks removed consecutively', () => {
    const result = computeBlockDiff(
      ['# Hello', 'Block A', 'Block B', 'Block C', 'Footer'],
      ['# Hello', 'Footer']
    );
    assert.deepStrictEqual(result.original.removed, [1, 2, 3]);
    assert.strictEqual(result.modified.gaps.length, 1);
    assert.strictEqual(result.modified.gaps[0].count, 3);
  });

  test('blocks added at the end', () => {
    const result = computeBlockDiff(
      ['# Hello'],
      ['# Hello', 'New block 1', 'New block 2']
    );
    assert.deepStrictEqual(result.modified.added, [1, 2]);
    assert.strictEqual(result.original.gaps.length, 1);
    assert.strictEqual(result.original.gaps[0].count, 2);
  });

  test('blocks removed from the beginning', () => {
    const result = computeBlockDiff(
      ['Preamble', '# Hello', 'Footer'],
      ['# Hello', 'Footer']
    );
    assert.deepStrictEqual(result.original.removed, [0]);
    assert.strictEqual(result.modified.gaps.length, 1);
    assert.strictEqual(result.modified.gaps[0].afterIndex, -1);
    assert.strictEqual(result.modified.gaps[0].count, 1);
  });

  test('both empty produces no diffs', () => {
    const result = computeBlockDiff([], []);
    assert.deepStrictEqual(result.original.changed, []);
    assert.deepStrictEqual(result.modified.changed, []);
    assert.deepStrictEqual(result.original.gaps, []);
    assert.deepStrictEqual(result.modified.gaps, []);
  });

  test('completely different content marks all as changed/added/removed', () => {
    const result = computeBlockDiff(
      ['A', 'B'],
      ['C', 'D']
    );
    // Should be refined as changed pairs since there are equal counts
    assert.deepStrictEqual(result.original.changed, [0, 1]);
    assert.deepStrictEqual(result.modified.changed, [0, 1]);
    assert.deepStrictEqual(result.original.removed, []);
    assert.deepStrictEqual(result.modified.added, []);
  });

  test('mixed insertions and modifications', () => {
    const result = computeBlockDiff(
      ['# Title', 'Original para', 'Footer'],
      ['# Title', 'Modified para', 'New insert', 'Footer']
    );
    // 'Original para' → 'Modified para' should be changed
    // 'New insert' should be added
    assert.deepStrictEqual(result.modified.changed, [1]);
    assert.deepStrictEqual(result.modified.added, [2]);
    assert.deepStrictEqual(result.original.changed, [1]);
    assert.strictEqual(result.original.gaps.length, 1);
    assert.strictEqual(result.original.gaps[0].count, 1);
  });

  test('empty original treats all modified blocks as added', () => {
    const result = computeBlockDiff(
      [],
      ['# Hello', 'World']
    );
    assert.deepStrictEqual(result.modified.added, [0, 1]);
    assert.strictEqual(result.original.gaps.length, 1);
    assert.strictEqual(result.original.gaps[0].count, 2);
  });

  test('empty modified treats all original blocks as removed', () => {
    const result = computeBlockDiff(
      ['# Hello', 'World'],
      []
    );
    assert.deepStrictEqual(result.original.removed, [0, 1]);
    assert.strictEqual(result.modified.gaps.length, 1);
    assert.strictEqual(result.modified.gaps[0].count, 2);
  });

  test('reordered blocks detected as remove + add, not false changes', () => {
    const result = computeBlockDiff(
      ['A', 'B', 'C'],
      ['C', 'B', 'A']
    );
    // B is matched (common subsequence), A and C are reordered
    // The LCS should find 'B' as a match (or possibly 'C')
    // Key assertion: not everything marked as changed
    const totalOrigOps = result.original.changed.length + result.original.removed.length;
    const totalModOps = result.modified.changed.length + result.modified.added.length;
    assert.ok(totalOrigOps < 3, 'should not mark all 3 blocks as changed on original');
    assert.ok(totalModOps < 3, 'should not mark all 3 blocks as changed on modified');
  });

  test('gap afterIndex is correct for middle insertion', () => {
    const result = computeBlockDiff(
      ['A', 'B', 'C'],
      ['A', 'X', 'Y', 'B', 'C']
    );
    // X, Y inserted between A and B
    assert.deepStrictEqual(result.modified.added, [1, 2]);
    assert.strictEqual(result.original.gaps.length, 1);
    // Gap should appear after block 0 (A) on the original side
    assert.strictEqual(result.original.gaps[0].afterIndex, 0);
    assert.strictEqual(result.original.gaps[0].count, 2);
  });
});
