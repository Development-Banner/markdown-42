declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  interface TaskListOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }
  function taskLists(md: MarkdownIt, options?: TaskListOptions): void;
  export = taskLists;
}

declare module 'markdown-it-emoji' {
  import type MarkdownIt from 'markdown-it';
  interface EmojiOptions {
    defs?: Record<string, string>;
    enabled?: string[];
    shortcuts?: Record<string, string | string[]>;
  }
  const bare: MarkdownIt.PluginWithOptions<EmojiOptions>;
  const full: MarkdownIt.PluginWithOptions<EmojiOptions>;
  const light: MarkdownIt.PluginWithOptions<EmojiOptions>;
}
