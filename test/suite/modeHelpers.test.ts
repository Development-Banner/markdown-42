import * as assert from 'assert';
import * as sinon from 'sinon';
import { applyModeVisibility, getSourceModeContent, updateEmptyState } from '../../media/modeHelpers';

interface FakePanel {
  hidden: boolean;
  dataset: Record<string, string | undefined>;
  style?: {
    display: string;
  };
}

interface FakeSourceEditor extends FakePanel {
  style: {
    display: string;
  };
  classList: {
    add: sinon.SinonSpy;
    remove: sinon.SinonSpy;
  };
}

function makeSourceEditor(hidden: boolean): FakeSourceEditor {
  return {
    hidden,
    dataset: {},
    style: {
      display: hidden ? 'none' : 'flex',
    },
    classList: {
      add: sinon.spy(),
      remove: sinon.spy(),
    },
  };
}

suite('modeHelpers', () => {
  teardown(() => {
    sinon.restore();
  });

  test('applyModeVisibility shows the source editor and hides preview blocks in source mode', () => {
    const sourceEditor = makeSourceEditor(true);
    const blocksContainer: FakePanel = { hidden: false, dataset: {} };
    const sourceTextarea: FakePanel = {
      hidden: true,
      dataset: {},
      style: { display: 'none' },
    };

    applyModeVisibility('source', blocksContainer, sourceEditor, sourceTextarea as {
      hidden: boolean;
      style: { display: string };
    });

    assert.strictEqual(sourceEditor.hidden, false);
    assert.strictEqual(sourceEditor.style.display, 'flex');
    assert.strictEqual(sourceTextarea.hidden, false);
    assert.strictEqual(sourceTextarea.style?.display, 'block');
    assert.strictEqual(blocksContainer.hidden, true);
    assert.ok(sourceEditor.classList.add.calledOnceWithExactly('source-visible'));
    assert.strictEqual(sourceEditor.classList.remove.callCount, 0);
  });

  test('applyModeVisibility fully hides the source editor when returning to preview', () => {
    const sourceEditor = makeSourceEditor(false);
    const blocksContainer: FakePanel = { hidden: true, dataset: {} };
    const sourceTextarea: FakePanel = {
      hidden: false,
      dataset: {},
      style: { display: 'block' },
    };

    applyModeVisibility('preview', blocksContainer, sourceEditor, sourceTextarea as {
      hidden: boolean;
      style: { display: string };
    });

    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(sourceEditor.style.display, 'none');
    assert.strictEqual(sourceTextarea.hidden, true);
    assert.strictEqual(sourceTextarea.style?.display, 'none');
    assert.strictEqual(blocksContainer.hidden, false);
    assert.ok(sourceEditor.classList.remove.calledOnceWithExactly('source-visible'));
    assert.strictEqual(sourceEditor.classList.add.callCount, 0);
  });

  test('applyModeVisibility preview keeps an already-hidden source subtree hidden', () => {
    const sourceEditor = makeSourceEditor(true);
    const blocksContainer: FakePanel = { hidden: true, dataset: {} };
    const sourceTextarea: FakePanel = {
      hidden: true,
      dataset: {},
      style: { display: 'none' },
    };

    applyModeVisibility('preview', blocksContainer, sourceEditor, sourceTextarea as {
      hidden: boolean;
      style: { display: string };
    });

    assert.strictEqual(sourceEditor.hidden, true);
    assert.strictEqual(sourceEditor.style.display, 'none');
    assert.strictEqual(sourceTextarea.hidden, true);
    assert.strictEqual(sourceTextarea.style?.display, 'none');
    assert.strictEqual(blocksContainer.hidden, false);
    assert.ok(sourceEditor.classList.remove.calledOnceWithExactly('source-visible'));
  });

  test('getSourceModeContent commits the active inline edit before serializing', () => {
    const commitActive = sinon.spy();
    const serialize = sinon.stub().returns('# latest');

    const content = getSourceModeContent(true, commitActive, serialize);

    assert.ok(commitActive.calledOnce);
    assert.ok(serialize.calledOnce);
    assert.ok(commitActive.calledBefore(serialize));
    assert.strictEqual(content, '# latest');
  });

  test('getSourceModeContent skips commit when no inline edit is active', () => {
    const commitActive = sinon.spy();
    const serialize = sinon.stub().returns('');

    const content = getSourceModeContent(false, commitActive, serialize);

    assert.strictEqual(commitActive.callCount, 0);
    assert.ok(serialize.calledOnce);
    assert.strictEqual(content, '');
  });

  test('updateEmptyState marks the preview as empty when content is blank', () => {
    const blocksContainer: FakePanel = { hidden: false, dataset: {} };

    updateEmptyState('   ', blocksContainer);

    assert.strictEqual(blocksContainer.dataset['empty'], 'true');
    assert.strictEqual(
      blocksContainer.dataset['emptyMessage'],
      'Document is empty. Switch to Source to start writing.'
    );
  });

  test('updateEmptyState clears the empty state once content exists', () => {
    const blocksContainer: FakePanel = {
      hidden: false,
      dataset: {
        empty: 'true',
        emptyMessage: 'Document is empty. Switch to Source to start writing.',
      },
    };

    updateEmptyState('# Hello', blocksContainer);

    assert.strictEqual(blocksContainer.dataset['empty'], undefined);
    assert.strictEqual(blocksContainer.dataset['emptyMessage'], undefined);
  });
});
