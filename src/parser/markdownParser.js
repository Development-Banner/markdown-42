"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdown = renderMarkdown;
exports.renderInline = renderInline;
const markdown_it_1 = __importDefault(require("markdown-it"));
const markdown_it_task_lists_1 = __importDefault(require("markdown-it-task-lists"));
const markdown_it_emoji_1 = __importDefault(require("markdown-it-emoji"));
// Security: html is DISABLED — raw HTML in .md files is stripped.
// This prevents XSS when opening untrusted markdown files from disk.
// XSS protection: linkify is enabled but links are rendered as <a> with
// href-only attributes; the webview intercepts clicks via openLink messages.
const md = new markdown_it_1.default({
    html: false,
    xhtmlOut: false,
    breaks: false,
    langPrefix: 'language-',
    linkify: true,
    typographer: true,
})
    .use(markdown_it_task_lists_1.default, { enabled: true, label: true, labelAfter: false })
    .use(markdown_it_emoji_1.default);
// Override link_open to add rel="noopener noreferrer" and data-href for
// interception in the webview (never navigates the webview itself).
const defaultLinkOpenRenderer = md.renderer.rules['link_open'] ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules['link_open'] = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    if (hrefIndex >= 0 && token.attrs) {
        const href = token.attrs[hrefIndex][1];
        // Store href as data attribute for safe retrieval in webview click handler
        token.attrSet('data-href', href);
        // Prevent default browser navigation inside webview
        token.attrSet('href', '#');
    }
    // Security: rel noopener prevents tab-napping via window.opener
    token.attrSet('rel', 'noopener noreferrer');
    return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};
/**
 * Renders markdown string to safe HTML.
 * All raw HTML is stripped. Links are intercepted via data-href.
 */
function renderMarkdown(markdown) {
    return md.render(markdown);
}
/**
 * Renders an inline markdown snippet (no wrapping <p> tag).
 */
function renderInline(markdown) {
    return md.renderInline(markdown);
}
//# sourceMappingURL=markdownParser.js.map