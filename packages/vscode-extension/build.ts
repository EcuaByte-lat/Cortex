#!/usr/bin/env bun
import { watch } from 'node:fs';

const isWatch = process.argv.includes('--watch');

async function buildExtension() {
  console.log('🔨 Building VS Code extension...');

  const result = await Bun.build({
    entrypoints: ['./src/extension.ts'],
    outdir: './dist',
    target: 'node',
    format: 'cjs',
    external: ['vscode'],
    minify: false,
    sourcemap: 'external',
  });

  if (result.success) {
    console.log('✅ Extension built successfully');

    // Copy sql-wasm.wasm to dist
    try {
      const { copyFileSync, existsSync, mkdirSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { createRequire } = await import('node:module');

      const require = createRequire(import.meta.url);
      const sqlJsPath = require.resolve('sql.js');
      const wasmPath = join(sqlJsPath, '..', 'sql-wasm.wasm');

      if (existsSync(wasmPath)) {
        if (!existsSync('./dist')) mkdirSync('./dist');
        copyFileSync(wasmPath, './dist/sql-wasm.wasm');
        console.log('✅ sql-wasm.wasm copied to dist');
      }
    } catch (e) {
      console.warn('⚠️ Could not copy sql-wasm.wasm automatically:', e);
    }
  } else {
    console.error('❌ Build failed:');
    result.logs.forEach((log) => console.error(log));
    if (!isWatch) {
      process.exit(1);
    }
  }
}

async function buildMcpServer() {
  console.log('🔨 Building Bundled MCP Server...');
  const result = await Bun.build({
    entrypoints: ['./src/bundledMcpServer.ts'],
    outdir: './dist',
    naming: {
      entry: 'mcp-server.js',
    },
    target: 'node',
    format: 'cjs',
    external: ['vscode'], // Just in case, though bundledMcpServer imports storage-node which is clean
    minify: false,
  });

  if (result.success) {
    console.log('✅ bundled MCP server built successfully');
  } else {
    console.error('❌ MCP server build failed:');
    result.logs.forEach((l) => console.error(l));
    if (!isWatch) process.exit(1);
  }
}

async function buildWebview() {
  console.log('🔨 Building Dashboard Webview...');
  const result = await Bun.build({
    entrypoints: ['./src/webview.tsx'],
    outdir: './dist',
    naming: { entry: 'webview.js' },
    target: 'browser',
    format: 'iife',
    minify: false,
    sourcemap: 'external',
  });

  if (result.success) {
    console.log('✅ Dashboard Webview built successfully');
  } else {
    console.error('❌ Dashboard Webview build failed:');
    result.logs.forEach((log) => console.error(log));
    if (!isWatch) process.exit(1);
  }
}

// Initial build
await buildExtension();
await buildWebview();
await buildMcpServer();

// Watch mode
if (isWatch) {
  console.log('👀 Watching for changes...');
  watch('./src', { recursive: true }, async (_event, filename) => {
    if (filename?.endsWith('.ts') || filename?.endsWith('.tsx')) {
      console.log(`\n📝 File changed: ${filename}`);
      await buildExtension();
      await buildWebview();
      await buildMcpServer();
    }
  });
}
