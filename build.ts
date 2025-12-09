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
  console.log(`📦 Building @cortex/${pkg}...`);
  
  const proc = Bun.spawn(['bun', 'run', 'build'], {
    cwd: `./packages/${pkg}`,
    stdout: 'inherit',
    stderr: 'inherit'
  });

  const exitCode = await proc.exited;
  const duration = Math.round(performance.now() - startTime);
  
  if (exitCode !== 0) {
    console.error(`❌ Failed to build ${pkg} (${duration}ms)`);
    return { package: pkg, success: false, duration };
  }
  
  console.log(`✅ ${pkg} built in ${duration}ms\n`);
  return { package: pkg, success: true, duration };
}

console.log('🏗️  Building Cortex monorepo (optimized)...\n');
const totalStart = performance.now();

try {
  // Step 1: Build core (required by all others)
  console.log('📍 Phase 1: Building core package...');
  const coreResult = await buildPackage('core');
  
  if (!coreResult.success) {
    process.exit(1);
  }
  
  // Step 2: Build dependent packages in parallel
  console.log('📍 Phase 2: Building dependent packages in parallel...');
  const dependentPackages = ['cli', 'mcp-server', 'vscode-extension'];
  
  const results = await Promise.all(
    dependentPackages.map(pkg => buildPackage(pkg))
  );
  
  // Check if all builds succeeded
  const failed = results.filter(r => !r.success);
  
  if (failed.length > 0) {
    console.error(`\n❌ Build failed for: ${failed.map(r => r.package).join(', ')}`);
    process.exit(1);
  }
  
  const totalDuration = Math.round(performance.now() - totalStart);
  const totalPackageTime = [coreResult, ...results].reduce((sum, r) => sum + r.duration, 0);
  const timeSaved = totalPackageTime - totalDuration;
  
  console.log('\n' + '='.repeat(60));
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
