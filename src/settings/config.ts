import * as vscode from 'vscode';
import type { WebviewConfig } from '../editor/MessageBus';

export type EditorMode = 'preview' | 'source';

export interface Markdown42Config {
  defaultMode: EditorMode;
  fontSize: number;
  lineWidth: number;
  syncScrollOutline: boolean;
  enableTelemetry: boolean;
  renderDelay: number;
  autoSave: boolean;
}

export function getConfig(): Markdown42Config {
  const cfg = vscode.workspace.getConfiguration('markdown42');
  return {
    defaultMode: cfg.get<EditorMode>('defaultMode', 'preview'),
    fontSize: clamp(cfg.get<number>('fontSize', 16), 10, 32),
    lineWidth: clamp(cfg.get<number>('lineWidth', 860), 400, 1800),
    syncScrollOutline: cfg.get<boolean>('syncScrollOutline', true),
    enableTelemetry: cfg.get<boolean>('enableTelemetry', false),
    renderDelay: clamp(cfg.get<number>('renderDelay', 150), 50, 1000),
    autoSave: cfg.get<boolean>('autoSave', true),
  };
}

export function toWebviewConfig(config: Markdown42Config, readOnly = false): WebviewConfig {
  return {
    fontSize: config.fontSize,
    lineWidth: config.lineWidth,
    renderDelay: config.renderDelay,
    syncScrollOutline: config.syncScrollOutline,
    mode: config.defaultMode,
    readOnly,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
