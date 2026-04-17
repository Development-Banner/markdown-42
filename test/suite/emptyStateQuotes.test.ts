import * as assert from 'assert';
import { EMPTY_STATE_QUOTES } from '../../media/emptyStateQuotes';

suite('emptyStateQuotes', () => {
  test('has at least 100 quotes', () => {
    assert.ok(
      EMPTY_STATE_QUOTES.length >= 100,
      `Expected ≥100 quotes, got ${EMPTY_STATE_QUOTES.length}`
    );
  });

  test('no duplicate quotes', () => {
    const unique = new Set(EMPTY_STATE_QUOTES);
    assert.strictEqual(
      unique.size,
      EMPTY_STATE_QUOTES.length,
      `Found ${EMPTY_STATE_QUOTES.length - unique.size} duplicate(s)`
    );
  });

  test('every quote is a non-empty trimmed string', () => {
    for (let i = 0; i < EMPTY_STATE_QUOTES.length; i++) {
      const q = EMPTY_STATE_QUOTES[i];
      assert.ok(typeof q === 'string' && q.length > 0, `Quote at index ${i} is empty`);
      assert.strictEqual(q, q.trim(), `Quote at index ${i} has leading/trailing whitespace`);
    }
  });

  test('no quote exceeds 100 characters', () => {
    for (let i = 0; i < EMPTY_STATE_QUOTES.length; i++) {
      assert.ok(
        EMPTY_STATE_QUOTES[i].length <= 100,
        `Quote at index ${i} is ${EMPTY_STATE_QUOTES[i].length} chars (max 100): "${EMPTY_STATE_QUOTES[i]}"`
      );
    }
  });
});
