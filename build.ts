#!/usr/bin/env bun

// Root build script - builds all packages in order
const packages = ['core', 'cli', 'mcp-server', 'vscode-extension'];

console.log('🏗️  Building Cortex monorepo...\n');

for (const pkg of packages) {
  console.log(`📦 Building @cortex/${pkg}...`);
  
  const proc = Bun.spawn(['bun', 'run', 'build'], {
    cwd: `./packages/${pkg}`,
    stdout: 'inherit',
    stderr: 'inherit'
  });

  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    console.error(`❌ Failed to build ${pkg}`);
    process.exit(1);
  }
  
  console.log(`✅ ${pkg} built\n`);
}

console.log('🎉 All packages built successfully!');

// Export to make this a module
export {};
