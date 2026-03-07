"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.toWebviewConfig = toWebviewConfig;
const vscode = __importStar(require("vscode"));
function getConfig() {
    const cfg = vscode.workspace.getConfiguration('markscape');
    return {
        defaultMode: cfg.get('defaultMode', 'preview'),
        fontSize: clamp(cfg.get('fontSize', 16), 10, 32),
        lineWidth: clamp(cfg.get('lineWidth', 860), 400, 1800),
        syncScrollOutline: cfg.get('syncScrollOutline', true),
        enableTelemetry: cfg.get('enableTelemetry', false),
        renderDelay: clamp(cfg.get('renderDelay', 150), 50, 1000),
    };
}
function toWebviewConfig(config) {
    return {
        fontSize: config.fontSize,
        lineWidth: config.lineWidth,
        renderDelay: config.renderDelay,
        syncScrollOutline: config.syncScrollOutline,
        mode: config.defaultMode,
    };
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
//# sourceMappingURL=config.js.map