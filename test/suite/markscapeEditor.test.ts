import * as assert from 'assert';

const Module = require('module') as { _load: any };
const originalLoad = Module._load;

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
    Module._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
      if (request === 'vscode') {
        return vscodeStub;
      }
      return originalLoad.call(this, request, parent, isMain);
    };

    return require('../../src/editor/MarkscapeEditor').Markdown42Editor as typeof import('../../src/editor/MarkscapeEditor').Markdown42Editor;
  } finally {
    Module._load = originalLoad;
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
});
