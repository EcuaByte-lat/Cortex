import { describe, it, expect, beforeEach } from 'bun:test';
import { ProjectContext } from '../context';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ProjectContext', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `cortex-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    ProjectContext.clearCache();
  });

  describe('getProjectId', () => {
    it('should return a consistent hash for the same directory', () => {
      const id1 = ProjectContext.getProjectId(testDir);
      const id2 = ProjectContext.getProjectId(testDir);
      
      expect(id1).toBe(id2);
      expect(id1).toHaveLength(16); // SHA-256 truncated to 16 chars
    });

    it('should return different hashes for different directories', () => {
      const dir1 = join(testDir, 'project1');
      const dir2 = join(testDir, 'project2');
      
      mkdirSync(dir1, { recursive: true });
      mkdirSync(dir2, { recursive: true });
      
      const id1 = ProjectContext.getProjectId(dir1);
      const id2 = ProjectContext.getProjectId(dir2);
      
      expect(id1).not.toBe(id2);
    });

    it('should detect git repository root', () => {
      const gitDir = join(testDir, '.git');
      mkdirSync(gitDir, { recursive: true });
      
      const subDir = join(testDir, 'src', 'components');
      mkdirSync(subDir, { recursive: true });
      
      // Both should return the same ID (git root)
      const rootId = ProjectContext.getProjectId(testDir);
      const subId = ProjectContext.getProjectId(subDir);
      
      expect(rootId).toBe(subId);
    });

    it('should use package.json for project identification', () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );
      
      const id = ProjectContext.getProjectId(testDir);
      
      expect(id).toBeTruthy();
      expect(id).toHaveLength(16);
    });

    it('should find package.json in parent directories', () => {
      const packageJson = {
        name: 'parent-project',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );
      
      const subDir = join(testDir, 'deeply', 'nested', 'folder');
      mkdirSync(subDir, { recursive: true });
      
      const rootId = ProjectContext.getProjectId(testDir);
      const nestedId = ProjectContext.getProjectId(subDir);
      
      expect(rootId).toBe(nestedId);
    });
  });

  describe('getProjectName', () => {
    it('should return package name when available', () => {
      const packageJson = {
        name: 'my-awesome-project',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );
      
      const name = ProjectContext.getProjectName(testDir);
      expect(name).toBe('my-awesome-project');
    });

    it('should return directory name when no package.json', () => {
      const name = ProjectContext.getProjectName(testDir);
      expect(name).toBeTruthy();
      expect(name).not.toBe('unknown-project');
    });

    it('should return git root directory name', () => {
      const gitDir = join(testDir, '.git');
      mkdirSync(gitDir, { recursive: true });
      
      const name = ProjectContext.getProjectName(testDir);
      expect(name).toBeTruthy();
      expect(name).not.toBe('unknown-project');
    });
  });

  describe('caching', () => {
    it('should cache project IDs', () => {
      const id1 = ProjectContext.getProjectId(testDir);
      
      // Modify the directory (add a file)
      writeFileSync(join(testDir, 'test.txt'), 'test');
      
      const id2 = ProjectContext.getProjectId(testDir);
      
      // Should return cached value
      expect(id1).toBe(id2);
    });

    it('should clear cache when requested', () => {
      const id1 = ProjectContext.getProjectId(testDir);
      
      ProjectContext.clearCache();
      
      const id2 = ProjectContext.getProjectId(testDir);
      
      // Should still be the same (deterministic)
      expect(id1).toBe(id2);
    });
  });
});
