import { createHash } from 'crypto';
import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * Detects the current project context to isolate memories per project.
 * Uses a combination of directory path, git repo, and package.json
 * to generate a unique, stable project identifier.
 */
export class ProjectContext {
  private static cache = new Map<string, string>();

  /**
   * Gets a stable project ID based on the current working directory
   * @param cwd - Current working directory (defaults to process.cwd())
   * @returns A stable hash representing the project
   */
  static getProjectId(cwd: string = process.cwd()): string {
    // Check cache first
    const cached = this.cache.get(cwd);
    if (cached) return cached;

    const projectId = this.detectProjectId(cwd);
    this.cache.set(cwd, projectId);
    return projectId;
  }

  /**
   * Detects project ID using multiple strategies for better accuracy
   */
  private static detectProjectId(cwd: string): string {
    // Strategy 1: Git repository root
    const gitRoot = this.findGitRoot(cwd);
    if (gitRoot) {
      return this.hashPath(gitRoot);
    }

    // Strategy 2: package.json location
    const packageJsonPath = this.findPackageJson(cwd);
    if (packageJsonPath) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      // Use package name + path for uniqueness
      const identifier = `${packageJson.name || 'unknown'}:${packageJsonPath}`;
      return this.hashString(identifier);
    }

    // Strategy 3: Fallback to current directory
    // Using absolute path ensures consistency across sessions
    return this.hashPath(resolve(cwd));
  }

  /**
   * Finds the root of a git repository by looking for .git directory
   */
  private static findGitRoot(startPath: string): string | null {
    let currentPath = resolve(startPath);
    const root = resolve('/');

    while (currentPath !== root) {
      const gitPath = join(currentPath, '.git');
      if (existsSync(gitPath)) {
        return currentPath;
      }
      currentPath = resolve(currentPath, '..');
    }

    return null;
  }

  /**
   * Finds the nearest package.json file
   */
  private static findPackageJson(startPath: string): string | null {
    let currentPath = resolve(startPath);
    const root = resolve('/');

    while (currentPath !== root) {
      const packagePath = join(currentPath, 'package.json');
      if (existsSync(packagePath)) {
        return packagePath;
      }
      currentPath = resolve(currentPath, '..');
    }

    return null;
  }

  /**
   * Creates a stable hash from a file path
   */
  private static hashPath(path: string): string {
    // Normalize path to handle cross-platform consistency
    const normalized = resolve(path).toLowerCase().replace(/\\/g, '/');
    return this.hashString(normalized);
  }

  /**
   * Creates a SHA-256 hash of a string (first 16 chars for readability)
   */
  private static hashString(input: string): string {
    return createHash('sha256')
      .update(input)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Gets a human-readable project name (for UI display)
   */
  static getProjectName(cwd: string = process.cwd()): string {
    // Try to get from package.json
    const packageJsonPath = this.findPackageJson(cwd);
    if (packageJsonPath) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.name) return packageJson.name;
      } catch {
        // Ignore parse errors
      }
    }

    // Try to get from git root directory name
    const gitRoot = this.findGitRoot(cwd);
    if (gitRoot) {
      return gitRoot.split(/[/\\]/).pop() || 'unknown-project';
    }

    // Fallback to current directory name
    return cwd.split(/[/\\]/).pop() || 'unknown-project';
  }

  /**
   * Clears the cache (useful for testing)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
