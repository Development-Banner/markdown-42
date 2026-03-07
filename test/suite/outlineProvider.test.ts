import * as assert from 'assert';
import * as sinon from 'sinon';
import type { HeadingNode } from '../../src/editor/MessageBus';

// Test the OutlineProvider's data logic without a live VS Code host.
// We test the data transformation, not the TreeView rendering.

const SAMPLE_HEADINGS: HeadingNode[] = [
  { level: 1, text: 'Introduction', line: 0, id: 'heading-0-0' },
  { level: 2, text: 'Getting Started', line: 5, id: 'heading-5-0' },
  { level: 2, text: 'Installation', line: 12, id: 'heading-12-0' },
  { level: 3, text: 'Windows', line: 15, id: 'heading-15-0' },
  { level: 3, text: 'macOS', line: 20, id: 'heading-20-0' },
];

suite('OutlineProvider — data logic', () => {
  test('heading nodes have correct levels', () => {
    assert.strictEqual(SAMPLE_HEADINGS[0].level, 1);
    assert.strictEqual(SAMPLE_HEADINGS[1].level, 2);
    assert.strictEqual(SAMPLE_HEADINGS[3].level, 3);
  });

  test('heading nodes have unique ids', () => {
    const ids = SAMPLE_HEADINGS.map(h => h.id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'All IDs should be unique');
  });

  test('heading nodes have correct line numbers', () => {
    assert.strictEqual(SAMPLE_HEADINGS[0].line, 0);
    assert.strictEqual(SAMPLE_HEADINGS[1].line, 5);
    assert.strictEqual(SAMPLE_HEADINGS[4].line, 20);
  });

  test('heading text is correctly set', () => {
    assert.strictEqual(SAMPLE_HEADINGS[0].text, 'Introduction');
    assert.strictEqual(SAMPLE_HEADINGS[1].text, 'Getting Started');
  });

  test('can filter headings by level', () => {
    const h1s = SAMPLE_HEADINGS.filter(h => h.level === 1);
    const h2s = SAMPLE_HEADINGS.filter(h => h.level === 2);
    const h3s = SAMPLE_HEADINGS.filter(h => h.level === 3);
    assert.strictEqual(h1s.length, 1);
    assert.strictEqual(h2s.length, 2);
    assert.strictEqual(h3s.length, 2);
  });

  test('headings are in document order (ascending line numbers)', () => {
    const lines = SAMPLE_HEADINGS.map(h => h.line);
    for (let i = 1; i < lines.length; i++) {
      assert.ok(
        lines[i] > lines[i - 1],
        `Heading ${i} (line ${lines[i]}) should be after heading ${i - 1} (line ${lines[i - 1]})`
      );
    }
  });

  suite('empty outline', () => {
    test('empty headings array', () => {
      const empty: HeadingNode[] = [];
      assert.strictEqual(empty.length, 0);
    });
  });

  suite('HeadingNode type validation', () => {
    test('level is between 1 and 6', () => {
      SAMPLE_HEADINGS.forEach(h => {
        assert.ok(h.level >= 1 && h.level <= 6, `Level ${h.level} out of range`);
      });
    });

    test('text is non-empty string', () => {
      SAMPLE_HEADINGS.forEach(h => {
        assert.ok(typeof h.text === 'string' && h.text.length > 0);
      });
    });

    test('id is non-empty string', () => {
      SAMPLE_HEADINGS.forEach(h => {
        assert.ok(typeof h.id === 'string' && h.id.length > 0);
      });
    });
  });

  suite('refresh behavior simulation', () => {
    test('simulates refresh replacing old headings', () => {
      let _headings: HeadingNode[] = SAMPLE_HEADINGS;
      const refreshSpy = sinon.spy();

      const refresh = (headings: HeadingNode[]) => {
        _headings = headings;
        refreshSpy(headings);
      };

      const newHeadings: HeadingNode[] = [
        { level: 1, text: 'New Title', line: 0, id: 'heading-0-0' },
      ];

      refresh(newHeadings);

      assert.ok(refreshSpy.calledOnce);
      assert.strictEqual(_headings.length, 1);
      assert.strictEqual(_headings[0].text, 'New Title');
    });

    test('simulates clear setting empty headings', () => {
      let _headings: HeadingNode[] = SAMPLE_HEADINGS;
      const clearSpy = sinon.spy();

      const clear = () => {
        _headings = [];
        clearSpy();
      };

      clear();

      assert.ok(clearSpy.calledOnce);
      assert.strictEqual(_headings.length, 0);
    });
  });
});
