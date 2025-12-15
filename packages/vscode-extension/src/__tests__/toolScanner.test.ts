import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ToolScanner } from '../toolScanner';

describe('ToolScanner', () => {
  let testDir: string;
  let scanner: ToolScanner;

  beforeEach(() => {
    testDir = join(tmpdir(), `cortex-tool-scanner-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    scanner = new ToolScanner(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('scanNpmScripts', () => {
    it('should detect npm scripts from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'tsc',
          test: 'jest',
          dev: 'nodemon',
        },
      };
      writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson));

      const result = await scanner.scan();
      const npmTools = result.categories.get('npm') || [];

      expect(npmTools).toHaveLength(3);
      expect(npmTools.map((t) => t.name)).toContain('build');
      expect(npmTools.map((t) => t.name)).toContain('test');
      expect(npmTools.map((t) => t.name)).toContain('dev');
    });

    it('should generate correct npm run commands', async () => {
      const packageJson = {
        scripts: { lint: 'eslint .' },
      };
      writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson));

      const result = await scanner.scan();
      const npmTools = result.categories.get('npm') || [];

      expect(npmTools[0].command).toBe('npm run lint');
      expect(npmTools[0].source).toBe('package.json');
    });

    it('should handle missing package.json gracefully', async () => {
      const result = await scanner.scan();
      const npmTools = result.categories.get('npm');

      expect(npmTools).toBeUndefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      writeFileSync(join(testDir, 'package.json'), 'not valid json');

      const result = await scanner.scan();
      const npmTools = result.categories.get('npm');

      expect(npmTools).toBeUndefined();
    });

    it('should handle package.json without scripts', async () => {
      writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = await scanner.scan();
      const npmTools = result.categories.get('npm');

      expect(npmTools).toBeUndefined();
    });
  });

  describe('scanMakefile', () => {
    it('should detect Makefile targets', async () => {
      const makefile = `
build:
	echo "Building..."

clean:
	rm -rf dist

test: build
	echo "Testing..."

.PHONY: build clean test
`;
      writeFileSync(join(testDir, 'Makefile'), makefile);

      const result = await scanner.scan();
      const makeTools = result.categories.get('make') || [];

      expect(makeTools.map((t) => t.name)).toContain('build');
      expect(makeTools.map((t) => t.name)).toContain('clean');
      expect(makeTools.map((t) => t.name)).toContain('test');
    });

    it('should skip internal targets starting with dot', async () => {
      const makefile = `
.PHONY: all
.DEFAULT_GOAL := all

all:
	echo "All"
`;
      writeFileSync(join(testDir, 'Makefile'), makefile);

      const result = await scanner.scan();
      const makeTools = result.categories.get('make') || [];

      // Should only have 'all', not .PHONY or .DEFAULT_GOAL
      expect(makeTools.map((t) => t.name)).toEqual(['all']);
    });

    it('should generate correct make commands', async () => {
      writeFileSync(join(testDir, 'Makefile'), 'deploy:\n\techo "deploying"');

      const result = await scanner.scan();
      const makeTools = result.categories.get('make') || [];

      expect(makeTools[0].command).toBe('make deploy');
      expect(makeTools[0].source).toBe('Makefile');
    });

    it('should handle missing Makefile gracefully', async () => {
      const result = await scanner.scan();
      const makeTools = result.categories.get('make');

      expect(makeTools).toBeUndefined();
    });
  });

  describe('scanDockerCompose', () => {
    it('should detect docker-compose.yml', async () => {
      writeFileSync(join(testDir, 'docker-compose.yml'), 'version: "3"');

      const result = await scanner.scan();
      const dockerTools = result.categories.get('docker') || [];

      expect(dockerTools.length).toBeGreaterThan(0);
      expect(dockerTools.map((t) => t.name)).toContain('up');
      expect(dockerTools.map((t) => t.name)).toContain('down');
    });

    it('should detect compose.yaml', async () => {
      writeFileSync(join(testDir, 'compose.yaml'), 'version: "3"');

      const result = await scanner.scan();
      const dockerTools = result.categories.get('docker') || [];

      expect(dockerTools.length).toBeGreaterThan(0);
      expect(dockerTools[0].source).toBe('compose.yaml');
    });

    it('should add standard docker-compose commands', async () => {
      writeFileSync(join(testDir, 'docker-compose.yml'), 'version: "3"');

      const result = await scanner.scan();
      const dockerTools = result.categories.get('docker') || [];

      const commands = dockerTools.map((t) => t.command);
      expect(commands).toContain('docker-compose up -d');
      expect(commands).toContain('docker-compose down');
      expect(commands).toContain('docker-compose logs -f');
      expect(commands).toContain('docker-compose build');
    });
  });

  describe('scanScripts', () => {
    it('should detect shell scripts in scripts directory', async () => {
      mkdirSync(join(testDir, 'scripts'));
      writeFileSync(join(testDir, 'scripts', 'deploy.sh'), '#!/bin/bash\necho "deploy"');
      writeFileSync(join(testDir, 'scripts', 'setup.sh'), '#!/bin/bash\necho "setup"');

      const result = await scanner.scan();
      const scriptTools = result.categories.get('script') || [];

      expect(scriptTools.map((t) => t.name)).toContain('deploy');
      expect(scriptTools.map((t) => t.name)).toContain('setup');
    });

    it('should detect scripts in bin directory', async () => {
      mkdirSync(join(testDir, 'bin'));
      writeFileSync(join(testDir, 'bin', 'run.sh'), '#!/bin/bash');

      const result = await scanner.scan();
      const scriptTools = result.categories.get('script') || [];

      expect(scriptTools.some((t) => t.name === 'run')).toBe(true);
    });

    it('should detect PowerShell scripts', async () => {
      mkdirSync(join(testDir, 'scripts'));
      writeFileSync(join(testDir, 'scripts', 'build.ps1'), 'Write-Host "Building"');

      const result = await scanner.scan();
      const scriptTools = result.categories.get('script') || [];

      expect(scriptTools.map((t) => t.name)).toContain('build');
      expect(scriptTools.find((t) => t.name === 'build')?.command).toContain('powershell');
    });

    it('should detect batch files', async () => {
      mkdirSync(join(testDir, 'scripts'));
      writeFileSync(join(testDir, 'scripts', 'install.bat'), '@echo off');

      const result = await scanner.scan();
      const scriptTools = result.categories.get('script') || [];

      expect(scriptTools.map((t) => t.name)).toContain('install');
    });

    it('should handle missing script directories gracefully', async () => {
      const result = await scanner.scan();
      const scriptTools = result.categories.get('script');

      expect(scriptTools).toBeUndefined();
    });
  });

  describe('scan (integration)', () => {
    it('should combine all tool types', async () => {
      // Create package.json
      writeFileSync(join(testDir, 'package.json'), JSON.stringify({ scripts: { build: 'tsc' } }));

      // Create Makefile
      writeFileSync(join(testDir, 'Makefile'), 'all:\n\techo "all"');

      // Create docker-compose
      writeFileSync(join(testDir, 'docker-compose.yml'), 'version: "3"');

      // Create scripts
      mkdirSync(join(testDir, 'scripts'));
      writeFileSync(join(testDir, 'scripts', 'deploy.sh'), '#!/bin/bash');

      const result = await scanner.scan();

      expect(result.categories.has('npm')).toBe(true);
      expect(result.categories.has('make')).toBe(true);
      expect(result.categories.has('docker')).toBe(true);
      expect(result.categories.has('script')).toBe(true);

      // Total tools should be sum of all categories
      const totalFromCategories = Array.from(result.categories.values()).reduce(
        (sum, tools) => sum + tools.length,
        0
      );
      expect(result.tools.length).toBe(totalFromCategories);
    });

    it('should return empty result for empty workspace', async () => {
      const result = await scanner.scan();

      expect(result.tools).toHaveLength(0);
      expect(result.categories.size).toBe(0);
    });
  });
});
