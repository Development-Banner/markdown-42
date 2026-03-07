// esbuild bundler for webview scripts (browser context, not Node.js)
// Run: node esbuild.config.js
// Run with watch: node esbuild.config.js --watch

const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

const ctx = esbuild.context({
  entryPoints: ['media/editor.ts'],
  bundle: true,
  outfile: 'media/editor.js',
  platform: 'browser',
  target: ['es2020'],
  format: 'iife',
  sourcemap: process.env.NODE_ENV !== 'production',
  minify: process.env.NODE_ENV === 'production',
  // No external requires — everything bundled for webview sandbox
  // Do NOT enable allowOverwrite unless you understand implications
  logLevel: 'info',
});

ctx.then(async (context) => {
  if (watch) {
    await context.watch();
    console.log('Watching media/ for changes...');
  } else {
    await context.rebuild();
    await context.dispose();
    console.log('Webview bundle built: media/editor.js');
  }
}).catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
