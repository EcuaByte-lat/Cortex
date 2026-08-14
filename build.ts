#!/usr/bin/env bun

/**
 * Optimized root build script with parallel execution
 * Builds packages in dependency order:
 * 1. core (required by others)
 * 2. cli, mcp-server, vscode-extension (parallel)
 */

interface BuildResult {
  package: string;
  success: boolean;
  duration: number;
}

async function buildPackage(pkg: string): Promise<BuildResult> {
  const startTime = performance.now();
  console.log(`📦 Building @ecuabyte/cortex-${pkg}...`);

  // Special handling for VS Code extension bundling
  if (pkg === 'vscode-extension') {
    try {
      // 1. Compile with tsc for type checking (optional but good)
      // 2. Bundle with Bun
      const result = await Bun.build({
        entrypoints: ['./packages/vscode-extension/src/extension.ts'],
        outdir: './packages/vscode-extension/dist',
        target: 'node',
        external: ['vscode', 'sql.js'], // vscode is provided by host, sql.js needs wasm handling
        minify: true,
        sourcemap: 'none',
      });

      if (!result.success) {
        console.error(result.logs);
        return { package: pkg, success: false, duration: 0 };
      }

      const webviewResult = await Bun.build({
        entrypoints: ['./packages/vscode-extension/src/webview.tsx'],
        outdir: './packages/vscode-extension/dist',
        naming: { entry: 'webview.js' },
        target: 'browser',
        format: 'iife',
        minify: true,
        sourcemap: 'none',
      });

      if (!webviewResult.success) {
        console.error(webviewResult.logs);
        return { package: pkg, success: false, duration: 0 };
      }

      // Copy sql-wasm.wasm to dist directory for runtime access
      const wasmSource = './node_modules/sql.js/dist/sql-wasm.wasm';
      const wasmDest = './packages/vscode-extension/dist/sql-wasm.wasm';
      try {
        const wasmFile = Bun.file(wasmSource);
        if (await wasmFile.exists()) {
          await Bun.write(wasmDest, wasmFile);
          console.log('  ✓ Copied sql-wasm.wasm to dist');
        } else {
          console.warn('  ⚠ sql-wasm.wasm not found, database may not work');
        }
      } catch (wasmError) {
        console.warn('  ⚠ Failed to copy sql-wasm.wasm:', wasmError);
      }
    } catch (e) {
      console.error(e);
      return { package: pkg, success: false, duration: 0 };
    }
  } else {
    // Standard build for other packages
    const proc = Bun.spawn(['bun', 'run', 'build'], {
      cwd: `./packages/${pkg}`,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const duration = Math.round(performance.now() - startTime);
      console.error(`❌ Failed to build ${pkg} (${duration}ms)`);
      return { package: pkg, success: false, duration };
    }
  }

  const duration = Math.round(performance.now() - startTime);
  console.log(`✅ ${pkg} built in ${duration}ms\n`);
  return { package: pkg, success: true, duration };
}

console.log('🏗️  Building Cortex monorepo (optimized)...\n');
const totalStart = performance.now();

try {
  // Step 0: Build shared package (required by all others)
  console.log('📍 Phase 0: Building shared package...');
  const sharedResult = await buildPackage('shared');

  if (!sharedResult.success) {
    process.exit(1);
  }

  // Step 1: Build core (required by all others)
  console.log('📍 Phase 1: Building core package...');
  const coreResult = await buildPackage('core');

  if (!coreResult.success) {
    process.exit(1);
  }

  // Step 2: Build dependent packages in parallel
  console.log('📍 Phase 2: Building dependent packages in parallel...');
  const dependentPackages = ['cli', 'mcp-server', 'vscode-extension'];

  const results = await Promise.all(dependentPackages.map((pkg) => buildPackage(pkg)));

  // Check if all builds succeeded
  const failed = results.filter((r) => !r.success);

  if (failed.length > 0) {
    console.error(`\n❌ Build failed for: ${failed.map((r) => r.package).join(', ')}`);
    process.exit(1);
  }

  const totalDuration = Math.round(performance.now() - totalStart);
  const totalPackageTime = [coreResult, ...results].reduce((sum, r) => sum + r.duration, 0);
  const timeSaved = totalPackageTime - totalDuration;

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 All packages built successfully!');
  console.log(`⏱️  Total time: ${totalDuration}ms`);
  console.log(`💾 Time saved by parallelization: ~${timeSaved}ms`);
  console.log('='.repeat(60));
} catch (error) {
  console.error('\n❌ Unexpected error during build:', error);
  process.exit(1);
}

// Export to make this a module
export {};
