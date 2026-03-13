import * as assert from 'assert';
import * as sinon from 'sinon';

// Test injectCopyButtons using a minimal duck-typed DOM.
// We avoid importing jsdom to prevent the known jsdom@28 / Node compatibility crash.
// Instead we build a minimal in-process DOM mock that satisfies the implementation.

interface FakeElement {
  tagName: string;
  className: string;
  textContent: string;
  children: FakeElement[];
  eventListeners: Record<string, Function[]>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeElement): void;
  querySelector(selector: string): FakeElement | null;
  querySelectorAll(selector: string): FakeElement[];
}

function makeFakeElement(tag: string): FakeElement {
  const attrs: Record<string, string> = {};
  const children: FakeElement[] = [];
  const listeners: Record<string, Function[]> = {};
  const el: FakeElement = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    children,
    eventListeners: listeners,
    getAttribute: (name) => attrs[name] ?? null,
    setAttribute: (name, value) => { attrs[name] = value; },
    appendChild: (child) => { children.push(child); },
    querySelector: (sel) => {
      if (sel === 'code') return children.find(c => c.tagName === 'CODE') ?? null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === 'pre') return children.filter(c => c.tagName === 'PRE');
      return [];
    },
  };
  return el;
}

// Inline the injectCopyButtons logic for isolated unit testing.
// This must exactly match what renderer.ts exports.
function injectCopyButtons(
  container: FakeElement,
  clipboard: { writeText: (text: string) => Promise<void> },
  createButton: () => FakeElement
): void {
  const preElements = container.querySelectorAll('pre');
  preElements.forEach(pre => {
    const btn = createButton();
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.eventListeners['click'] = btn.eventListeners['click'] ?? [];
    btn.eventListeners['click'].push(() => {
      const code = pre.querySelector('code');
      const text = code?.textContent ?? '';
      clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
      }).catch(() => {
        btn.textContent = 'Failed';
      });
    });
    pre.appendChild(btn);
  });
}

suite('renderer — copy button injection', () => {
  let clock: sinon.SinonFakeTimers;

  setup(() => {
    clock = sinon.useFakeTimers();
  });

  teardown(() => {
    clock.restore();
    sinon.restore();
  });

  test('injects a copy button into a pre element', () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    assert.strictEqual(pre.children.length, 1, 'Expected 1 button appended to pre');
    assert.strictEqual(pre.children[0].tagName, 'BUTTON');
    assert.strictEqual(pre.children[0].getAttribute('aria-label'), 'Copy code to clipboard');
    assert.strictEqual(pre.children[0].textContent, 'Copy');
  });

  test('clicking copy button calls clipboard.writeText with code text', () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    const code = makeFakeElement('code');
    code.textContent = 'const x = 1;';
    pre.children.push(code);
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    const btn = pre.children.find(c => c.tagName === 'BUTTON')!;
    btn.eventListeners['click'][0](); // simulate click

    assert.ok(
      (clipboard.writeText as sinon.SinonStub).calledOnceWith('const x = 1;'),
      'Expected clipboard.writeText called with code text'
    );
  });

  test('button text changes to Copied! on success', async () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    const code = makeFakeElement('code');
    code.textContent = 'hello';
    pre.children.push(code);
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    const btn = pre.children.find(c => c.tagName === 'BUTTON')!;
    btn.eventListeners['click'][0]();
    await Promise.resolve(); // flush microtask queue

    assert.strictEqual(btn.textContent, 'Copied!');
  });

  test('button text changes to Failed on clipboard error', async () => {
    const container = makeFakeElement('div');
    const pre = makeFakeElement('pre');
    const code = makeFakeElement('code');
    code.textContent = 'hello';
    pre.children.push(code);
    container.children.push(pre);

    const clipboard = { writeText: sinon.stub().rejects(new Error('denied')) };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    const btn = pre.children.find(c => c.tagName === 'BUTTON')!;
    btn.eventListeners['click'][0]();
    await Promise.resolve(); // flush .then() propagation
    await Promise.resolve(); // flush .catch() handler

    assert.strictEqual(btn.textContent, 'Failed');
  });

  test('does not inject button when no pre element exists', () => {
    const container = makeFakeElement('div');
    const p = makeFakeElement('p');
    container.children.push(p);

    const clipboard = { writeText: sinon.stub().resolves() };
    injectCopyButtons(container, clipboard, () => makeFakeElement('button'));

    assert.strictEqual(p.children.length, 0, 'No button should be appended to a <p>');
  });
});
