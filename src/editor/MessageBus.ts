// Typed message protocol between extension host and webview.
// Using a discriminated union prevents silent failures when message shapes drift.

export interface HeadingNode {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  /** Line number in the source document (0-based) */
  line: number;
  /** Unique id used for scroll anchoring */
  id: string;
}

export type HostToWebview =
  | { type: 'update'; content: string; version: number; config: WebviewConfig }
  | { type: 'scrollTo'; line: number }
  | { type: 'setMode'; mode: 'preview' | 'source' }
  | { type: 'configChange'; config: WebviewConfig };

export type WebviewToHost =
  | { type: 'edit'; content: string; version: number }
  | { type: 'ready' }
  | { type: 'save' }
  | { type: 'outline'; headings: HeadingNode[] }
  | { type: 'openLink'; href: string }
  | { type: 'error'; message: string };

export interface WebviewConfig {
  fontSize: number;
  lineWidth: number;
  renderDelay: number;
  syncScrollOutline: boolean;
  mode: 'preview' | 'source';
}
