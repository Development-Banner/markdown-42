import * as assert from 'assert';
import * as sinon from 'sinon';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

(global as Record<string, unknown>)['window'] = dom.window;
(global as Record<string, unknown>)['document'] = dom.window.document;
(global as Record<string, unknown>)['HTMLElement'] = dom.window.HTMLElement;

import { createEmptyState, destroyEmptyState } from '../../media/emptyState';

suite('emptyState', () => {
  let container: HTMLElement;

  setup(() => {
    container = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(container);
  });

  teardown(() => {
    container.remove();
    sinon.restore();
  });

  test('createEmptyState appends DOM to container', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'test quote');

    const el = container.querySelector('.empty-state');
    assert.ok(el, 'empty-state element should exist');
  });

  test('createEmptyState renders the ghost pen SVG with aria-hidden', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const svg = container.querySelector('.empty-state-character svg');
    assert.ok(svg, 'SVG should exist inside character container');
    assert.strictEqual(svg!.getAttribute('aria-hidden'), 'true');
  });

  test('pickQuote parameter controls quote selection', () => {
    createEmptyState(container, false, sinon.spy(), () => 'custom quote here');

    const quote = container.querySelector('.empty-state-quote');
    assert.ok(quote);
    assert.strictEqual(quote!.textContent, 'custom quote here');
  });

  test('quote is a plain <p> element', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const quote = container.querySelector('.empty-state-quote');
    assert.ok(quote);
    assert.strictEqual(quote!.tagName, 'P');
    assert.strictEqual(quote!.getAttribute('role'), null);
  });

  test('createEmptyState renders three action buttons when not readOnly', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const buttons = container.querySelectorAll('.empty-state-btn');
    assert.strictEqual(buttons.length, 3);

    const labels = Array.from(buttons).map(b => b.textContent);
    assert.deepStrictEqual(labels, ['Start writing', 'Basic structure', 'Table template']);
  });

  test('readOnly omits action buttons', () => {
    createEmptyState(container, true, sinon.spy(), () => 'q');

    const buttons = container.querySelectorAll('.empty-state-btn');
    assert.strictEqual(buttons.length, 0);
  });

  test('readOnly shows fallback message', () => {
    createEmptyState(container, true, sinon.spy(), () => 'q');

    const quote = container.querySelector('.empty-state-quote');
    assert.ok(quote);
    assert.strictEqual(quote!.textContent, 'Nothing here.');
  });

  test('button click fires correct action: start-writing', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'q');

    const btn = container.querySelectorAll('.empty-state-btn')[0] as HTMLButtonElement;
    btn.click();
    assert.ok(onAction.calledOnceWithExactly('start-writing'));
  });

  test('button click fires correct action: basic-structure', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'q');

    const btn = container.querySelectorAll('.empty-state-btn')[1] as HTMLButtonElement;
    btn.click();
    assert.ok(onAction.calledOnceWithExactly('basic-structure'));
  });

  test('button click fires correct action: table-template', () => {
    const onAction = sinon.spy();
    createEmptyState(container, false, onAction, () => 'q');

    const btn = container.querySelectorAll('.empty-state-btn')[2] as HTMLButtonElement;
    btn.click();
    assert.ok(onAction.calledOnceWithExactly('table-template'));
  });

  test('destroyEmptyState removes all empty state DOM', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');
    assert.ok(container.querySelector('.empty-state'));

    destroyEmptyState(container);
    assert.strictEqual(container.querySelector('.empty-state'), null);
  });

  test('destroyEmptyState on container without empty state is a no-op', () => {
    assert.doesNotThrow(() => destroyEmptyState(container));
  });

  test('calling createEmptyState twice does not duplicate DOM', () => {
    createEmptyState(container, false, sinon.spy(), () => 'q');
    createEmptyState(container, false, sinon.spy(), () => 'q');

    const elements = container.querySelectorAll('.empty-state');
    assert.strictEqual(elements.length, 1);
  });
});
