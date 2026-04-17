import * as assert from 'assert';
import * as Module from 'module';

type ModuleLoad = (request: string, parent: unknown, isMain: boolean) => unknown;

type ModuleWithLoad = typeof Module & {
  _load: ModuleLoad;
};

const moduleWithLoad = Module.createRequire(__filename)('module') as ModuleWithLoad;
const originalLoad = moduleWithLoad._load;

const vscodeStub = {
  Uri: {
    joinPath: (_base: unknown, ...segments: string[]) => ({
      toString: () => segments.join('/'),
    }),
  },
  EventEmitter: class {
    event = () => undefined;
    fire(): void {}
    dispose(): void {}
  },
  TreeItem: class {},
  TreeItemCollapsibleState: { None: 0 },
  ThemeIcon: class {
    constructor(public readonly id: string) {}
  },
  commands: {
    executeCommand: async (): Promise<void> => undefined,
    registerCommand: () => ({ dispose: () => undefined }),
  },
  env: {
    openExternal: async (): Promise<void> => undefined,
  },
  window: {
    registerCustomEditorProvider: () => ({ dispose: () => undefined }),
    createTreeView: () => ({ dispose: () => undefined }),
  },
  workspace: {
    onDidChangeTextDocument: () => ({ dispose: () => undefined }),
    onDidChangeConfiguration: () => ({ dispose: () => undefined }),
  },
};

const Markdown42Editor = (() => {
  try {
    Object.defineProperty(moduleWithLoad, '_load', {
      value: function patchedLoad(request: string, parent: unknown, isMain: boolean) {
        if (request === 'vscode') {
          return vscodeStub;
        }
        return originalLoad.call(this, request, parent, isMain);
      },
      writable: true,
      configurable: true,
    });

    const testRequire = Module.createRequire(__filename);
    return testRequire('../../src/editor/MarkscapeEditor').Markdown42Editor as typeof import('../../src/editor/MarkscapeEditor').Markdown42Editor;
  } finally {
    Object.defineProperty(moduleWithLoad, '_load', {
      value: originalLoad,
      writable: true,
      configurable: true,
    });
  }
})();

function makeEditor(): InstanceType<typeof Markdown42Editor> {
  const context = {
    extensionUri: { toString: () => 'file:///extension' },
  } as unknown as import('vscode').ExtensionContext;
  const outlineProvider = {
    refresh: () => undefined,
    clear: () => undefined,
  } as unknown as import('../../src/outline/OutlineProvider').OutlineProvider;

  return new Markdown42Editor(context, outlineProvider);
}

function makeWebview() {
  return {
    cspSource: 'vscode-webview://test',
    asWebviewUri: (uri: { toString(): string }) => `webview:${uri.toString()}`,
  };
}

function buildHtml(configOverrides: Record<string, unknown> = {}): string {
  const editor = makeEditor();
  const buildHtmlMethod = editor as unknown as {
    buildHtml(webview: ReturnType<typeof makeWebview>, config: unknown): string;
  };

  return buildHtmlMethod.buildHtml(makeWebview(), configOverrides);
}

suite('MarkscapeEditor edit echo suppression', () => {
  /**
   * When the webview sends an 'edit' message, the host applies it via
   * WorkspaceEdit. This fires onDidChangeTextDocument. Without the
   * isApplyingWebviewEdit guard, the host would echo the change back
   * as an 'update', causing a redundant renderUpdate and flicker.
   */
  test('webview edit does not echo back an update message', async () => {
    // Capture the docChange listener so we can fire it manually
    let docChangeListener: ((e: { document: { uri: { toString(): string }; getText(): string; version: number } }) => void) | null = null;
    const sentMessages: { type: string }[] = [];

    // Build a vscode stub that captures the handlers
    const testVscodeStub = {
      ...vscodeStub,
      workspace: {
        ...vscodeStub.workspace,
        onDidChangeTextDocument: (listener: typeof docChangeListener) => {
          docChangeListener = listener;
          return { dispose: () => undefined };
        },
        onDidChangeConfiguration: () => ({ dispose: () => undefined }),
        applyEdit: async () => {
          // Simulate VS Code behavior: onDidChangeTextDocument fires
          // synchronously during workspace.applyEdit, before it resolves.
          if (docChangeListener) {
            docChangeListener({
              document: {
                uri: { toString: () => 'file:///test.md' },
                getText: () => '# Updated',
                version: 2,
              },
            });
          }
          return true;
        },
        getConfiguration: () => ({
          get: (_key: string, defaultVal: unknown) => defaultVal,
        }),
      },
      Range: class {
        constructor(public start: unknown, public end: unknown) {}
      },
      WorkspaceEdit: class {
        replace(): void {}
      },
    };

    // Reload MarkscapeEditor with the test stub
    const TestEditor = (() => {
      try {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: function patchedLoad(request: string, parent: unknown, isMain: boolean) {
            if (request === 'vscode') return testVscodeStub;
            return originalLoad.call(this, request, parent, isMain);
          },
          writable: true,
          configurable: true,
        });
        // Clear cached modules so we get fresh loads with our stub
        const testRequire = Module.createRequire(__filename);
        for (const mod of [
          '../../src/editor/MarkscapeEditor',
          '../../src/editor/DocumentModel',
          '../../src/settings/config',
          '../../src/outline/OutlineProvider',
          '../../src/extension',
        ]) {
          try {
            delete require.cache[testRequire.resolve(mod)];
          } catch { /* module may not be cached yet */ }
        }
        return testRequire('../../src/editor/MarkscapeEditor').Markdown42Editor;
      } finally {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: originalLoad,
          writable: true,
          configurable: true,
        });
      }
    })();

    const context = {
      extensionUri: { toString: () => 'file:///extension' },
    };
    const outlineProvider = { refresh: () => undefined, clear: () => undefined };
    const editor = new TestEditor(context, outlineProvider);

    // Mock webview message handler
    let webviewMessageHandler: ((msg: unknown) => void) | null = null;
    const fakeDocument = {
      uri: { toString: () => 'file:///test.md', scheme: 'file' },
      getText: () => '# Hello',
      positionAt: () => ({ line: 0, character: 0 }),
      version: 1,
      fileName: '/test.md',
      save: async () => true,
    };
    const fakeWebviewPanel = {
      webview: {
        options: {},
        html: '',
        asWebviewUri: (uri: { toString(): string }) => `webview:${uri.toString()}`,
        cspSource: 'test',
        onDidReceiveMessage: (handler: (msg: unknown) => void) => {
          webviewMessageHandler = handler;
          return { dispose: () => undefined };
        },
        postMessage: (msg: { type: string }) => {
          sentMessages.push(msg);
        },
      },
      active: true,
      onDidChangeViewState: () => ({ dispose: () => undefined }),
      onDidDispose: () => ({ dispose: () => undefined }),
    };

    await editor.resolveCustomTextEditor(fakeDocument, fakeWebviewPanel, {});

    // Clear messages from the 'ready' flow
    sentMessages.length = 0;

    // Simulate webview sending an edit
    assert.ok(webviewMessageHandler, 'webview message handler registered');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (webviewMessageHandler as any)({ type: 'edit', content: '# Updated', version: 1 });

    // The docChange event was fired inside applyEdit (via the stub).
    // The key assertion: no 'update' message should have been echoed back
    const updateMessages = sentMessages.filter(m => m.type === 'update');
    assert.strictEqual(
      updateMessages.length,
      0,
      `Expected no update echo, but got ${updateMessages.length} update(s)`
    );
  });
});

suite('MarkscapeEditor read-only (original side of diff)', () => {
  /**
   * When the document scheme is not 'file' (e.g. git://), the host must:
   * 1. Set readOnly:true in the webview config
   * 2. Silently drop 'edit' messages (defense-in-depth)
   * 3. Silently drop 'save' messages (defense-in-depth)
   */
  test('edit messages from a git:// panel are silently dropped', async () => {
    let appliedEdits = 0;
    const sentMessages: { type: string }[] = [];

    const testVscodeStub = {
      ...vscodeStub,
      workspace: {
        ...vscodeStub.workspace,
        onDidChangeTextDocument: () => ({ dispose: () => undefined }),
        onDidChangeConfiguration: () => ({ dispose: () => undefined }),
        applyEdit: async () => { appliedEdits++; return true; },
        getConfiguration: () => ({
          get: (_key: string, defaultVal: unknown) => defaultVal,
        }),
      },
      Range: class { constructor(public start: unknown, public end: unknown) {} },
      WorkspaceEdit: class { replace(): void {} },
    };

    const TestEditor = (() => {
      try {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: function patchedLoad(request: string, parent: unknown, isMain: boolean) {
            if (request === 'vscode') return testVscodeStub;
            return originalLoad.call(this, request, parent, isMain);
          },
          writable: true,
          configurable: true,
        });
        const testRequire = Module.createRequire(__filename);
        for (const mod of [
          '../../src/editor/MarkscapeEditor',
          '../../src/editor/DocumentModel',
          '../../src/settings/config',
          '../../src/outline/OutlineProvider',
          '../../src/extension',
        ]) {
          try { delete require.cache[testRequire.resolve(mod)]; } catch { /* ok */ }
        }
        return testRequire('../../src/editor/MarkscapeEditor').Markdown42Editor;
      } finally {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: originalLoad,
          writable: true,
          configurable: true,
        });
      }
    })();

    const context = { extensionUri: { toString: () => 'file:///extension' } };
    const outlineProvider = { refresh: () => undefined, clear: () => undefined };
    const editor = new TestEditor(context, outlineProvider);

    let webviewMessageHandler: ((msg: unknown) => void) | null = null;
    const fakeDocument = {
      uri: { toString: () => 'git:///test.md', scheme: 'git' },  // ← original side
      getText: () => '# Hello',
      positionAt: () => ({ line: 0, character: 0 }),
      version: 1,
      fileName: '/test.md',
      save: async () => true,
    };
    const fakeWebviewPanel = {
      webview: {
        options: {},
        html: '',
        asWebviewUri: (uri: { toString(): string }) => `webview:${uri.toString()}`,
        cspSource: 'test',
        onDidReceiveMessage: (handler: (msg: unknown) => void) => {
          webviewMessageHandler = handler;
          return { dispose: () => undefined };
        },
        postMessage: (msg: { type: string }) => { sentMessages.push(msg); },
      },
      active: true,
      onDidChangeViewState: () => ({ dispose: () => undefined }),
      onDidDispose: () => ({ dispose: () => undefined }),
    };

    await editor.resolveCustomTextEditor(fakeDocument, fakeWebviewPanel, {});
    sentMessages.length = 0;

    assert.ok(webviewMessageHandler, 'webview message handler registered');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (webviewMessageHandler as any)({ type: 'edit', content: '# Hacked', version: 1 });

    assert.strictEqual(appliedEdits, 0, 'edit must be dropped for git:// scheme');
  });

  test('save messages from a git:// panel are silently dropped', async () => {
    let saveCount = 0;
    const testVscodeStub = {
      ...vscodeStub,
      workspace: {
        ...vscodeStub.workspace,
        onDidChangeTextDocument: () => ({ dispose: () => undefined }),
        onDidChangeConfiguration: () => ({ dispose: () => undefined }),
        applyEdit: async () => true,
        getConfiguration: () => ({
          get: (_key: string, defaultVal: unknown) => defaultVal,
        }),
      },
      Range: class { constructor(public start: unknown, public end: unknown) {} },
      WorkspaceEdit: class { replace(): void {} },
    };

    const TestEditor = (() => {
      try {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: function patchedLoad(request: string, parent: unknown, isMain: boolean) {
            if (request === 'vscode') return testVscodeStub;
            return originalLoad.call(this, request, parent, isMain);
          },
          writable: true,
          configurable: true,
        });
        const testRequire = Module.createRequire(__filename);
        for (const mod of [
          '../../src/editor/MarkscapeEditor',
          '../../src/editor/DocumentModel',
          '../../src/settings/config',
          '../../src/outline/OutlineProvider',
          '../../src/extension',
        ]) {
          try { delete require.cache[testRequire.resolve(mod)]; } catch { /* ok */ }
        }
        return testRequire('../../src/editor/MarkscapeEditor').Markdown42Editor;
      } finally {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: originalLoad,
          writable: true,
          configurable: true,
        });
      }
    })();

    const context = { extensionUri: { toString: () => 'file:///extension' } };
    const outlineProvider = { refresh: () => undefined, clear: () => undefined };
    const editor = new TestEditor(context, outlineProvider);

    let webviewMessageHandler: ((msg: unknown) => void) | null = null;
    const fakeDocument = {
      uri: { toString: () => 'git:///test.md', scheme: 'git' },
      getText: () => '# Hello',
      positionAt: () => ({ line: 0, character: 0 }),
      version: 1,
      fileName: '/test.md',
      save: async () => { saveCount++; return true; },
    };
    const fakeWebviewPanel = {
      webview: {
        options: {},
        html: '',
        asWebviewUri: (uri: { toString(): string }) => `webview:${uri.toString()}`,
        cspSource: 'test',
        onDidReceiveMessage: (handler: (msg: unknown) => void) => {
          webviewMessageHandler = handler;
          return { dispose: () => undefined };
        },
        postMessage: () => undefined,
      },
      active: true,
      onDidChangeViewState: () => ({ dispose: () => undefined }),
      onDidDispose: () => ({ dispose: () => undefined }),
    };

    await editor.resolveCustomTextEditor(fakeDocument, fakeWebviewPanel, {});

    assert.ok(webviewMessageHandler, 'webview message handler registered');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (webviewMessageHandler as any)({ type: 'save' });

    assert.strictEqual(saveCount, 0, 'save must be dropped for git:// scheme');
  });

  test('ready response includes readOnly:true for git:// documents', async () => {
    const sentMessages: Record<string, unknown>[] = [];

    const testVscodeStub = {
      ...vscodeStub,
      workspace: {
        ...vscodeStub.workspace,
        onDidChangeTextDocument: () => ({ dispose: () => undefined }),
        onDidChangeConfiguration: () => ({ dispose: () => undefined }),
        getConfiguration: () => ({
          get: (_key: string, defaultVal: unknown) => defaultVal,
        }),
      },
    };

    const TestEditor = (() => {
      try {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: function patchedLoad(request: string, parent: unknown, isMain: boolean) {
            if (request === 'vscode') return testVscodeStub;
            return originalLoad.call(this, request, parent, isMain);
          },
          writable: true,
          configurable: true,
        });
        const testRequire = Module.createRequire(__filename);
        for (const mod of [
          '../../src/editor/MarkscapeEditor',
          '../../src/editor/DocumentModel',
          '../../src/settings/config',
          '../../src/outline/OutlineProvider',
          '../../src/extension',
        ]) {
          try { delete require.cache[testRequire.resolve(mod)]; } catch { /* ok */ }
        }
        return testRequire('../../src/editor/MarkscapeEditor').Markdown42Editor;
      } finally {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: originalLoad,
          writable: true,
          configurable: true,
        });
      }
    })();

    const context = { extensionUri: { toString: () => 'file:///extension' } };
    const outlineProvider = { refresh: () => undefined, clear: () => undefined };
    const editor = new TestEditor(context, outlineProvider);

    let webviewMessageHandler: ((msg: unknown) => void) | null = null;
    const fakeDocument = {
      uri: { toString: () => 'git:///test.md', scheme: 'git' },
      getText: () => '# Hello',
      positionAt: () => ({ line: 0, character: 0 }),
      version: 1,
      fileName: '/test.md',
      save: async () => true,
    };
    const fakeWebviewPanel = {
      webview: {
        options: {},
        html: '',
        asWebviewUri: (uri: { toString(): string }) => `webview:${uri.toString()}`,
        cspSource: 'test',
        onDidReceiveMessage: (handler: (msg: unknown) => void) => {
          webviewMessageHandler = handler;
          return { dispose: () => undefined };
        },
        postMessage: (msg: Record<string, unknown>) => { sentMessages.push(msg); },
      },
      active: true,
      onDidChangeViewState: () => ({ dispose: () => undefined }),
      onDidDispose: () => ({ dispose: () => undefined }),
    };

    await editor.resolveCustomTextEditor(fakeDocument, fakeWebviewPanel, {});
    sentMessages.length = 0;

    assert.ok(webviewMessageHandler, 'webview message handler registered');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (webviewMessageHandler as any)({ type: 'ready' });

    const updateMsg = sentMessages.find(m => m['type'] === 'update') as Record<string, unknown> | undefined;
    assert.ok(updateMsg, 'expected an update message after ready');
    const config = updateMsg['config'] as Record<string, unknown>;
    assert.strictEqual(config['readOnly'], true, 'config.readOnly must be true for git:// scheme');
  });

  test('ready response includes readOnly:false for file:// documents', async () => {
    const sentMessages: Record<string, unknown>[] = [];

    const testVscodeStub = {
      ...vscodeStub,
      workspace: {
        ...vscodeStub.workspace,
        onDidChangeTextDocument: () => ({ dispose: () => undefined }),
        onDidChangeConfiguration: () => ({ dispose: () => undefined }),
        getConfiguration: () => ({
          get: (_key: string, defaultVal: unknown) => defaultVal,
        }),
      },
    };

    const TestEditor = (() => {
      try {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: function patchedLoad(request: string, parent: unknown, isMain: boolean) {
            if (request === 'vscode') return testVscodeStub;
            return originalLoad.call(this, request, parent, isMain);
          },
          writable: true,
          configurable: true,
        });
        const testRequire = Module.createRequire(__filename);
        for (const mod of [
          '../../src/editor/MarkscapeEditor',
          '../../src/editor/DocumentModel',
          '../../src/settings/config',
          '../../src/outline/OutlineProvider',
          '../../src/extension',
        ]) {
          try { delete require.cache[testRequire.resolve(mod)]; } catch { /* ok */ }
        }
        return testRequire('../../src/editor/MarkscapeEditor').Markdown42Editor;
      } finally {
        Object.defineProperty(moduleWithLoad, '_load', {
          value: originalLoad,
          writable: true,
          configurable: true,
        });
      }
    })();

    const context = { extensionUri: { toString: () => 'file:///extension' } };
    const outlineProvider = { refresh: () => undefined, clear: () => undefined };
    const editor = new TestEditor(context, outlineProvider);

    let webviewMessageHandler: ((msg: unknown) => void) | null = null;
    const fakeDocument = {
      uri: { toString: () => 'file:///test.md', scheme: 'file' },
      getText: () => '# Hello',
      positionAt: () => ({ line: 0, character: 0 }),
      version: 1,
      fileName: '/test.md',
      save: async () => true,
    };
    const fakeWebviewPanel = {
      webview: {
        options: {},
        html: '',
        asWebviewUri: (uri: { toString(): string }) => `webview:${uri.toString()}`,
        cspSource: 'test',
        onDidReceiveMessage: (handler: (msg: unknown) => void) => {
          webviewMessageHandler = handler;
          return { dispose: () => undefined };
        },
        postMessage: (msg: Record<string, unknown>) => { sentMessages.push(msg); },
      },
      active: true,
      onDidChangeViewState: () => ({ dispose: () => undefined }),
      onDidDispose: () => ({ dispose: () => undefined }),
    };

    await editor.resolveCustomTextEditor(fakeDocument, fakeWebviewPanel, {});
    sentMessages.length = 0;

    assert.ok(webviewMessageHandler, 'webview message handler registered');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (webviewMessageHandler as any)({ type: 'ready' });

    const updateMsg = sentMessages.find(m => m['type'] === 'update') as Record<string, unknown> | undefined;
    assert.ok(updateMsg, 'expected an update message after ready');
    const config = updateMsg['config'] as Record<string, unknown>;
    assert.strictEqual(config['readOnly'], false, 'config.readOnly must be false for file:// scheme');
  });
});

suite('MarkscapeEditor buildHtml read-only guards', () => {
  test('readOnly:true adds read-only class to <body>', () => {
    const html = buildHtml({ readOnly: true });
    assert.match(html, /<body class="read-only">/, 'body must have read-only class');
  });

  test('readOnly:false does not add read-only class to <body>', () => {
    const html = buildHtml({ readOnly: false });
    assert.match(html, /<body>/, 'body must not have read-only class');
    assert.ok(!html.includes('class="read-only"'), 'read-only class must be absent');
  });

  test('readOnly:true sets textarea to readonly from initial HTML', () => {
    const html = buildHtml({ readOnly: true });
    assert.match(html, /<textarea[^>]*readonly/, 'textarea must have readonly attribute');
  });

  test('readOnly:false does not set textarea readonly', () => {
    const html = buildHtml({ readOnly: false });
    // Match the textarea tag and verify no readonly attribute
    const textareaMatch = html.match(/<textarea[^>]*>/);
    assert.ok(textareaMatch, 'textarea must exist');
    assert.ok(!textareaMatch[0].includes('readonly'), 'textarea must not have readonly attribute');
  });

  test('default config (no readOnly) produces writable HTML', () => {
    const html = buildHtml();
    assert.match(html, /<body>/, 'body must not have read-only class');
    const textareaMatch = html.match(/<textarea[^>]*>/);
    assert.ok(textareaMatch, 'textarea must exist');
    assert.ok(!textareaMatch[0].includes('readonly'), 'textarea must not be readonly');
  });
});

suite('MarkscapeEditor buildHtml tab bar', () => {
  test('tab bar contains Preview and Source buttons', () => {
    const html = buildHtml();
    assert.ok(html.includes('id="tab-preview"'), html);
    assert.ok(html.includes('id="tab-source"'), html);
    assert.ok(html.includes('role="tablist"'), html);
  });

  test('Preview tab is aria-selected by default', () => {
    const html = buildHtml();
    assert.ok(
      html.includes('id="tab-preview"') &&
      html.includes('aria-selected="true"'),
      html
    );
  });

  test('Source tab is aria-selected false by default', () => {
    const html = buildHtml();
    assert.ok(
      html.includes('id="tab-source"') &&
      html.includes('aria-selected="false"'),
      html
    );
  });

  test('tab bar has role tablist', () => {
    const html = buildHtml();
    assert.ok(html.includes('role="tablist"'), html);
  });

  test('initial HTML nests the source textarea inside the hidden source editor container', () => {
    const html = buildHtml();
    assert.match(
      html,
      /<div id="source-editor" aria-label="Source editor" hidden>\s*<textarea id="source-textarea" spellcheck="false" aria-label="Markdown source"><\/textarea>\s*<\/div>/
    );
  });

  test('sync button is in the tab bar HTML', () => {
    const html = buildHtml();
    // Verify sync-btn appears after tab-bar opens and before content-wrapper
    const tabBarIdx = html.indexOf('id="tab-bar"');
    const syncBtnIdx = html.indexOf('id="sync-btn"');
    const contentWrapperIdx = html.indexOf('id="content-wrapper"');
    assert.ok(tabBarIdx !== -1, 'tab-bar div not found');
    assert.ok(syncBtnIdx > tabBarIdx, 'sync-btn not found after tab-bar');
    assert.ok(syncBtnIdx < contentWrapperIdx, 'sync-btn not inside tab-bar');
  });

  test('mode buttons are wrapped in a .mode-toggle pill container', () => {
    const html = buildHtml();
    assert.ok(html.includes('class="mode-toggle"'), html);
  });

  test('Preview tab has an SVG icon', () => {
    const html = buildHtml();
    // The tab-preview button must contain an SVG with class tab-icon
    assert.ok(html.includes('tab-icon'), html);
  });

  test('sync-btn replaces save-btn in the tab bar', () => {
    const html = buildHtml();
    assert.ok(html.includes('id="sync-btn"'), html);
    assert.ok(!html.includes('id="save-btn"'), 'save-btn should not exist');
  });

  test('sync-btn has initial data-state of saved', () => {
    const html = buildHtml();
    assert.ok(html.includes('data-state="saved"'), html);
  });

  test('sync-btn contains .sync-text span', () => {
    const html = buildHtml();
    assert.ok(html.includes('class="sync-text"'), html);
  });
});
