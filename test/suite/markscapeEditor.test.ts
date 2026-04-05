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

function buildHtml(): string {
  const editor = makeEditor();
  const buildHtmlMethod = editor as unknown as {
    buildHtml(webview: ReturnType<typeof makeWebview>, config: unknown): string;
  };

  return buildHtmlMethod.buildHtml(makeWebview(), {});
}

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
