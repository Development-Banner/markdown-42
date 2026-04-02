export type EditorMode = 'preview' | 'source';

interface SourceEditorLike {
  hidden: boolean;
  style: {
    display: string;
  };
  classList: {
    add: (token: string) => void;
    remove: (token: string) => void;
  };
}

interface BlocksContainerLike {
  hidden: boolean;
  dataset: Record<string, string | undefined>;
}

interface SourceTextareaLike {
  hidden: boolean;
  style: {
    display: string;
  };
}

export function applyModeVisibility(
  mode: EditorMode,
  sourceEditor: SourceEditorLike,
  blocksContainer: BlocksContainerLike,
  sourceTextarea: SourceTextareaLike
): void {
  const showSource = mode === 'source';
  sourceEditor.hidden = !showSource;
  sourceEditor.style.display = showSource ? 'flex' : 'none';
  sourceTextarea.hidden = !showSource;
  sourceTextarea.style.display = showSource ? 'block' : 'none';
  if (showSource) {
    sourceEditor.classList.add('source-visible');
  } else {
    sourceEditor.classList.remove('source-visible');
  }
  blocksContainer.hidden = showSource;
}

export function getSourceModeContent(
  editing: boolean,
  commitActiveEdit: () => void,
  serializeCurrentBlocks: () => string
): string {
  if (editing) {
    commitActiveEdit();
  }
  return serializeCurrentBlocks();
}

export function updateEmptyState(
  content: string,
  blocksContainer: BlocksContainerLike
): void {
  if (content.trim().length === 0) {
    blocksContainer.dataset['empty'] = 'true';
    blocksContainer.dataset['emptyMessage'] = 'Document is empty. Switch to Source to start writing.';
    return;
  }

  delete blocksContainer.dataset['empty'];
  delete blocksContainer.dataset['emptyMessage'];
}
