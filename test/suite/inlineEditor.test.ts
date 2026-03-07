/**
 * Unit tests for media/inlineEditor.ts — DOM-level tests using jsdom.
 *
 * These tests specifically guard against the regression where BOTH the
 * rendered block content AND the inline textarea are visible simultaneously
 * (BUG-007: textarea + rendered content overlap in edit mode).
 *
 * jsdom provides a minimal browser DOM so we can import and test the
 * inlineEditor module without a full VS Code Extension Host or browser.
 */
import * as assert from 'assert';
import { JSDOM } from 'jsdom';

// ─── jsdom bootstrap ─────────────────────────────────────────────────────────
// Set up a minimal browser-like global environment before importing the module.
// inlineEditor.ts uses document, HTMLElement, etc. — jsdom provides these.

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

// Inject globals so the ESM module (compiled to CJS by tsc) can reference them
(global as Record<string, unknown>)['window']   = dom.window;
(global as Record<string, unknown>)['document'] = dom.window.document;
(global as Record<string, unknown>)['HTMLElement'] = dom.window.HTMLElement;

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Creates a block div mimicking what renderer.ts produces. */
function makeBlockDiv(html: string, index: number): HTMLElement {
  const div = dom.window.document.createElement('div');
  div.className = 'block';
  div.dataset['blockIndex'] = String(index);
  div.innerHTML = html;
  dom.window.document.body.appendChild(div);
  return div;
}

function removeBlockDiv(div: HTMLElement): void {
  div.remove();
}

// Lazy-require inlineEditor AFTER globals are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { enterEditMode, isEditing, getActiveBlockIndex, commitActiveEdit } = require('../../media/inlineEditor') as typeof import('../../media/inlineEditor');

// ─── tests ───────────────────────────────────────────────────────────────────

suite('inlineEditor — DOM behavior', () => {
  suite('enterEditMode — child hiding (BUG-007 regression guard)', () => {
    test('hides rendered paragraph child when entering edit mode', () => {
      const div = makeBlockDiv('<p>Hello world</p>', 0);
      const p = div.querySelector('p') as HTMLElement;

      enterEditMode(div, 'Hello world', 0, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(
        p.style.display,
        'none',
        'Rendered <p> must be display:none when textarea is active'
      );
      removeBlockDiv(div);
    });

    test('hides rendered table child when entering edit mode', () => {
      const tableHtml = '<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
        '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
      const div = makeBlockDiv(tableHtml, 1);
      const table = div.querySelector('table') as HTMLElement;

      enterEditMode(div, '| A | B |\n|---|---|\n| 1 | 2 |', 1, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(
        table.style.display,
        'none',
        'Rendered <table> must be display:none when textarea is active'
      );
      removeBlockDiv(div);
    });

    test('hides ALL children when block has multiple top-level elements', () => {
      const div = makeBlockDiv('<p>Para</p><ul><li>item</li></ul>', 2);
      const children = Array.from(div.children) as HTMLElement[];

      enterEditMode(div, 'Para\n\n- item', 2, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      for (const child of children) {
        if (child.hasAttribute('data-editor-textarea')) continue;
        assert.strictEqual(
          child.style.display,
          'none',
          `Child <${child.tagName}> should be display:none, got: ${child.style.display}`
        );
      }
      removeBlockDiv(div);
    });

    test('textarea is visible (not hidden) when in edit mode', () => {
      const div = makeBlockDiv('<p>Content</p>', 3);

      enterEditMode(div, 'Content', 3, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      const textarea = div.querySelector('textarea') as HTMLTextAreaElement | null;
      assert.ok(textarea, 'textarea must exist in block during edit mode');
      assert.notStrictEqual(
        textarea.style.display,
        'none',
        'textarea must NOT be hidden during edit mode'
      );
      removeBlockDiv(div);
    });

    test('textarea contains the raw markdown passed to enterEditMode', () => {
      const raw = '# My Heading';
      const div = makeBlockDiv('<h1>My Heading</h1>', 4);

      enterEditMode(div, raw, 4, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      const textarea = div.querySelector('textarea') as HTMLTextAreaElement;
      assert.strictEqual(textarea.value, raw, 'textarea.value must equal raw markdown');
      removeBlockDiv(div);
    });

    test('block receives editing class when in edit mode', () => {
      const div = makeBlockDiv('<p>Para</p>', 5);

      enterEditMode(div, 'Para', 5, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.ok(div.classList.contains('editing'), 'block must have class "editing"');
      removeBlockDiv(div);
    });

    test('isEditing() returns true when a block is active', () => {
      const div = makeBlockDiv('<p>Para</p>', 6);

      enterEditMode(div, 'Para', 6, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(isEditing(), true);
      removeBlockDiv(div);
    });

    test('getActiveBlockIndex() returns correct index', () => {
      const div = makeBlockDiv('<p>Para</p>', 7);

      enterEditMode(div, 'Para', 7, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(getActiveBlockIndex(), 7);
      removeBlockDiv(div);
    });

    test('data-hiddenByEditor attribute is set on hidden children', () => {
      const div = makeBlockDiv('<p>Para</p>', 8);
      const p = div.querySelector('p') as HTMLElement;

      enterEditMode(div, 'Para', 8, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(
        p.dataset['hiddenByEditor'],
        '1',
        'Hidden children must carry data-hiddenByEditor="1" for cleanup'
      );
      removeBlockDiv(div);
    });

    test('entering edit mode on same block twice is a no-op', () => {
      const div = makeBlockDiv('<p>Para</p>', 9);

      let commitCount = 0;
      const callbacks = {
        onCommit: () => { commitCount++; },
        onCancel: () => { /* noop */ },
      };

      enterEditMode(div, 'Para', 9, callbacks, 0);
      enterEditMode(div, 'Para', 9, callbacks, 0);

      // Should still have exactly one textarea
      const textareas = div.querySelectorAll('textarea');
      assert.strictEqual(textareas.length, 1, 'Only one textarea should exist');
      removeBlockDiv(div);
    });

    test('calling enterEditMode on the same block twice does not add a second textarea', () => {
      // Regression: clicking the rendered table header while already in edit
      // mode for that block must be a no-op.  enterEditMode guards this with
      // `if (_activeBlockIndex === blockIndex) return;`
      const div = makeBlockDiv('<table><thead><tr><th>A</th></tr></thead></table>', 15);

      enterEditMode(div, '| A |\n|---|\n', 15, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      const before = div.querySelectorAll('textarea').length;

      // Simulate click on table header (same block, same index)
      enterEditMode(div, '| A |\n|---|\n', 15, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      const after = div.querySelectorAll('textarea').length;
      assert.strictEqual(before, 1, 'Should have exactly one textarea after first enter');
      assert.strictEqual(after, 1, 'Should still have exactly one textarea after re-click');
      removeBlockDiv(div);
    });

    test('table child is hidden when entering edit mode on table block', () => {
      // Regression guard for BUG-008: table renders alongside textarea when
      // user clicks the table header row while already in edit mode.
      const tableHtml =
        '<table><thead><tr><th>Dep</th><th>Purpose</th></tr></thead>' +
        '<tbody><tr><td>lodash</td><td>utils</td></tr></tbody></table>';
      const div = makeBlockDiv(tableHtml, 16);
      const table = div.querySelector('table') as HTMLElement;

      enterEditMode(div, 'Dep    Purpose\n------ -------\nlodash utils', 16, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(table.style.display, 'none',
        '<table> must be display:none immediately after enterEditMode');

      const ta = div.querySelector('textarea') as HTMLTextAreaElement;
      assert.ok(ta, 'textarea must exist');
      assert.notStrictEqual(ta.style.display, 'none', 'textarea must be visible');
      removeBlockDiv(div);
    });

    test('commitActiveEdit() clears active state and removes textarea', () => {
      const div = makeBlockDiv('<p>Para</p>', 20);

      let committed = false;
      enterEditMode(div, 'Para', 20, {
        onCommit: () => { committed = true; },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(isEditing(), true);
      commitActiveEdit();

      assert.strictEqual(isEditing(), false, 'isEditing should be false after commitActiveEdit');
      assert.strictEqual(div.querySelector('textarea'), null, 'textarea must be removed');
      assert.ok(committed, 'onCommit should have been called');
      removeBlockDiv(div);
    });

    test('commitActiveEdit() restores hidden children', () => {
      const div = makeBlockDiv('<p>Para</p>', 21);
      const p = div.querySelector('p') as HTMLElement;

      enterEditMode(div, 'Para', 21, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(p.style.display, 'none');

      commitActiveEdit();

      assert.notStrictEqual(p.style.display, 'none', 'Hidden children restored after commit');
      removeBlockDiv(div);
    });

    test('Escape key triggers cancel callback', (done) => {
      const div = makeBlockDiv('<p>Original</p>', 10);
      let cancelled = false;

      enterEditMode(div, 'Original', 10, {
        onCommit: () => { /* noop */ },
        onCancel: (_idx) => { cancelled = true; done(); },
      }, 0);

      const textarea = div.querySelector('textarea') as HTMLTextAreaElement;
      const escEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(escEvent);

      // Give the synchronous handler time to run
      setTimeout(() => {
        if (!cancelled) {
          done(new Error('onCancel was not called after Escape key'));
        }
      }, 50);
    });

    // ── BUG regression: click/Ctrl+Enter inside textarea re-enters edit mode ──

    test('Ctrl+Enter commits and clears active state (no re-entry)', () => {
      // Regression guard: Ctrl+Enter fires _commitBlock which calls _cleanup
      // (sets _activeBlockIndex = null) and then the keydown event used to
      // bubble to the block div's keydown handler. The block div would call
      // onClick → handleBlockClick, see isEditing()===false, and re-enter edit
      // mode. e.stopPropagation() in the textarea handler prevents this.
      const div = makeBlockDiv('<p>Para</p>', 40);
      let commitCount = 0;

      enterEditMode(div, 'Para', 40, {
        onCommit: () => { commitCount++; },
        onCancel: () => { /* noop */ },
      }, 0);

      const textarea = div.querySelector('textarea') as HTMLTextAreaElement;
      const ctrlEnter = new dom.window.KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(ctrlEnter);

      assert.strictEqual(isEditing(), false, 'Should not be in edit mode after Ctrl+Enter');
      assert.strictEqual(commitCount, 1, 'onCommit must fire exactly once');
      assert.strictEqual(div.querySelector('textarea'), null, 'textarea must be removed');
      removeBlockDiv(div);
    });

    test('Escape stops propagation — does not re-trigger edit mode', () => {
      // Regression guard: Escape calls _cancelBlock → _cleanup → _activeBlockIndex = null.
      // Without stopPropagation the bubbled Escape could reach a parent handler
      // that re-enters edit mode.
      const div = makeBlockDiv('<p>Para</p>', 41);
      let cancelCount = 0;

      enterEditMode(div, 'Para', 41, {
        onCommit: () => { /* noop */ },
        onCancel: () => { cancelCount++; },
      }, 0);

      const textarea = div.querySelector('textarea') as HTMLTextAreaElement;
      const escEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(escEvent);

      assert.strictEqual(isEditing(), false, 'Should not be editing after Escape');
      assert.strictEqual(cancelCount, 1, 'onCancel must fire exactly once');
      removeBlockDiv(div);
    });

    test('clicking textarea while in edit mode does not add a second textarea', () => {
      // Regression guard: textarea click event bubbles to block div click
      // handler. The fix in renderer.ts ignores clicks where target is TEXTAREA.
      // Here we verify that entering edit mode twice (simulating the bubbled
      // click re-calling enterEditMode for the same block) is still a no-op.
      const div = makeBlockDiv('<p>Para</p>', 42);

      enterEditMode(div, 'Para', 42, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      // Simulate what the block div click handler would do if it fired:
      // call enterEditMode again for the same block index.
      enterEditMode(div, 'Para', 42, {
        onCommit: () => { /* noop */ },
        onCancel: () => { /* noop */ },
      }, 0);

      assert.strictEqual(div.querySelectorAll('textarea').length, 1,
        'Must still have exactly one textarea after simulated bubbled click');
      removeBlockDiv(div);
    });
  });
});
