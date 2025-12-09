#!/usr/bin/env bun
import { watch } from 'fs';

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
    sourcemap: 'external'
  });

  if (result.success) {
    console.log('✅ Extension built successfully');
  } else {
    console.error('❌ Build failed:');
    result.logs.forEach(log => console.error(log));
    if (!isWatch) {
      process.exit(1);
    }
  }
}

// Initial build
await buildExtension();

// Watch mode
if (isWatch) {
  console.log('👀 Watching for changes...');
  watch('./src', { recursive: true }, async (event, filename) => {
    if (filename?.endsWith('.ts')) {
      console.log(`\n📝 File changed: ${filename}`);
      await buildExtension();
    }
  });
}
