#!/usr/bin/env bun

/**
 * Custom publish script for Bun workspaces
 *
 * This script resolves workspace: protocol dependencies before publishing
 * because changesets doesn't support Bun's workspace protocol.
 *
 * Strategy:
 * 1. Read all package versions
 * 2. Replace workspace:^ with actual ^version in package.json
 * 3. Run npm publish
 * 4. Restore original package.json
 *
 * @see https://github.com/oven-sh/bun/issues/24687
 * @see https://github.com/changesets/changesets/discussions/1389
 */

import { join } from 'node:path';
import { $ } from 'bun';

const PACKAGES_DIR = join(import.meta.dir, '..', 'packages');

// Order matters: dependencies must be published first
const PUBLISH_ORDER = ['shared', 'core', 'cli', 'mcp-server', 'vscode-extension'];

interface PackageInfo {
  name: string;
  version: string;
  path: string;
}

interface PublishResult {
  package: string;
  success: boolean;
  message: string;
}

// Get all package info
async function getAllPackages(): Promise<Map<string, PackageInfo>> {
  // Ensure .npmrc exists with token for npm publish
  const token = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN;
  if (token) {
    console.log('🔑 Configuring .npmrc with token...');
    const npmrcPath = join(import.meta.dir, '..', '.npmrc');
    const npmrcContent = `//registry.npmjs.org/:_authToken=${token}\nregistry=https://registry.npmjs.org/\n`;
    await Bun.write(npmrcPath, npmrcContent);
  } else {
    console.warn('⚠️ No NPM_TOKEN found! Publishing might fail.');
  }

  const packages = new Map<string, PackageInfo>();

  for (const dir of PUBLISH_ORDER) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    try {
      const pkg = await Bun.file(pkgPath).json();
      packages.set(pkg.name, {
        name: pkg.name,
        version: pkg.version,
        path: join(PACKAGES_DIR, dir),
      });
    } catch {
      console.error(`Could not read ${pkgPath}`);
    }
  }

  return packages;
}

// Resolve workspace: dependencies to actual versions
async function resolveWorkspaceDeps(
  pkgPath: string,
  allPackages: Map<string, PackageInfo>
): Promise<string> {
  const pkgJsonPath = join(pkgPath, 'package.json');
  const original = await Bun.file(pkgJsonPath).text();
  const pkg = JSON.parse(original);

  let modified = false;

  // Check dependencies
  for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = pkg[depType];
    if (!deps) continue;

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        const targetPkg = allPackages.get(name);
        if (targetPkg) {
          // workspace:^ -> ^x.y.z, workspace:* -> x.y.z
          const prefix = version === 'workspace:^' ? '^' : '';
          deps[name] = `${prefix}${targetPkg.version}`;
          modified = true;
          console.log(`   Resolved ${name}: ${version} -> ${deps[name]}`);
        }
      }
    }
  }

  if (modified) {
    await Bun.write(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  return original;
}

// Restore original package.json
async function restorePackageJson(pkgPath: string, original: string): Promise<void> {
  const pkgJsonPath = join(pkgPath, 'package.json');
  await Bun.write(pkgJsonPath, original);
}

async function isVersionPublished(name: string, version: string): Promise<boolean> {
  try {
    const result = await $`npm view ${name}@${version} version 2>/dev/null`.quiet().nothrow();
    return result.text().trim() === version;
  } catch {
    return false;
  }
}

async function publishPackage(
  dir: string,
  allPackages: Map<string, PackageInfo>
): Promise<PublishResult> {
  const pkgPath = join(PACKAGES_DIR, dir);
  const info = allPackages.get(
    Array.from(allPackages.values()).find((p) => p.path === pkgPath)?.name || ''
  );

  if (!info) {
    return { package: dir, success: false, message: 'Could not find package info' };
  }

  // Check if already published
  if (await isVersionPublished(info.name, info.version)) {
    return {
      package: info.name,
      success: true,
      message: `Already published at ${info.version}`,
    };
  }

  console.log(`📦 Publishing ${info.name}@${info.version}...`);

  // Resolve workspace dependencies
  const original = await resolveWorkspaceDeps(pkgPath, allPackages);

  try {
    // Use npm publish: setup-node configures the registry and npm auth in CI.
    // workspace: dependencies have already been resolved above.
    const result = await $`cd ${pkgPath} && npm publish --access public 2>&1`.nothrow();

    if (result.exitCode !== 0) {
      const output = result.text();
      console.error(`❌ Failed to publish ${info.name}:`);
      console.error(output);
      return {
        package: info.name,
        success: false,
        message: output.slice(0, 200),
      };
    }

    console.log(`✅ ${info.name}@${info.version} published successfully`);
    return {
      package: info.name,
      success: true,
      message: `Published ${info.version}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to publish ${info.name}: ${message}`);
    return {
      package: info.name,
      success: false,
      message,
    };
  } finally {
    // Always restore original package.json
    await restorePackageJson(pkgPath, original);
  }
}

async function main() {
  console.log('🚀 Starting workspace publish...\n');

  const allPackages = await getAllPackages();
  console.log(`Found ${allPackages.size} packages to publish\n`);

  const results: PublishResult[] = [];

  for (const dir of PUBLISH_ORDER) {
    const result = await publishPackage(dir, allPackages);
    results.push(result);

    // Stop on failure for dependent packages
    if (!result.success && !result.message.includes('Already published')) {
      console.error(`\n❌ Stopping due to failure in ${result.package}`);
      break;
    }
  }

  console.log('\n📊 Publish Summary:');
  console.log('─'.repeat(50));

  const published = results.filter((r) => r.success && r.message.includes('Published'));
  const skipped = results.filter((r) => r.success && r.message.includes('Already'));
  const failed = results.filter((r) => !r.success);

  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.package}: ${r.message}`);
  }

  console.log('─'.repeat(50));
  console.log(
    `Published: ${published.length}, Skipped: ${skipped.length}, Failed: ${failed.length}`
  );

  // Create git tags for published packages
  if (published.length > 0) {
    console.log('\n🏷️  Creating git tags...');
    for (const r of published) {
      const pkgInfo = Array.from(allPackages.values()).find((p) => p.name === r.package);
      if (pkgInfo) {
        try {
          await $`git tag ${pkgInfo.name}@${pkgInfo.version}`.quiet().nothrow();
          console.log(`   Tagged: ${pkgInfo.name}@${pkgInfo.version}`);
        } catch {
          // Tag might already exist
        }
      }
    }

    // Push tags
    try {
      await $`git push --tags`.quiet().nothrow();
      console.log('   Pushed tags to remote');
    } catch {
      console.log('   Could not push tags (might need permissions)');
    }
  }

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const publishedPackages = JSON.stringify(
      published
        .map((r) => {
          const pkgInfo = Array.from(allPackages.values()).find((p) => p.name === r.package);
          return pkgInfo ? { name: pkgInfo.name, version: pkgInfo.version } : null;
        })
        .filter(Boolean)
    );

    await Bun.write(
      process.env.GITHUB_OUTPUT,
      `published=${published.length > 0}\npublishedPackages=${publishedPackages}\n`
    );
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
