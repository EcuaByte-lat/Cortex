import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export interface Tool {
  name: string;
  command: string;
  category: 'npm' | 'make' | 'docker' | 'script';
  source: string;
}

export interface ScanResult {
  tools: Tool[];
  categories: Map<string, Tool[]>;
}

/**
 * Scans the workspace for available tools and scripts
 */
export class ToolScanner {
  constructor(private workspacePath: string) {
    console.log('[Cortex ToolScanner] Initialized with path:', workspacePath);
  }

  /**
   * Scan all supported tool types in the workspace
   */
  async scan(): Promise<ScanResult> {
    const tools: Tool[] = [];

    // Scan root directory
    const npmTools = this.scanNpmScripts(this.workspacePath);
    const makeTools = this.scanMakefile(this.workspacePath);
    const dockerTools = this.scanDockerCompose(this.workspacePath);
    const scriptTools = this.scanScripts(this.workspacePath);

    tools.push(...npmTools, ...makeTools, ...dockerTools, ...scriptTools);

    // Scan immediate subdirectories for monorepo support
    const subDirs = this.getSubdirectories();
    console.log('[Cortex ToolScanner] Scanning subdirectories:', subDirs);

    for (const subDir of subDirs) {
      const subPath = join(this.workspacePath, subDir);
      const subNpmTools = this.scanNpmScripts(subPath, subDir);
      tools.push(...subNpmTools);
    }

    console.log('[Cortex ToolScanner] Total tools found:', tools.length);

    // Group by category
    const categories = new Map<string, Tool[]>();
    for (const tool of tools) {
      const existing = categories.get(tool.category) || [];
      existing.push(tool);
      categories.set(tool.category, existing);
    }

    return { tools, categories };
  }

  /**
   * Get immediate subdirectories (for monorepo support)
   */
  private getSubdirectories(): string[] {
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.vscode', '.idea', 'coverage'];

    try {
      const entries = readdirSync(this.workspacePath, { withFileTypes: true });
      return entries
        .filter(
          (entry) =>
            entry.isDirectory() && !ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')
        )
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Detect the package manager used in the workspace
   */
  private detectPackageManager(): string {
    // Check for lock files to determine package manager
    if (
      existsSync(join(this.workspacePath, 'bun.lockb')) ||
      existsSync(join(this.workspacePath, 'bun.lock'))
    ) {
      return 'bun';
    }
    if (existsSync(join(this.workspacePath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (existsSync(join(this.workspacePath, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }

  /**
   * Scan package.json for npm/bun scripts
   * @param scanPath - Path to scan (defaults to workspace root)
   * @param prefix - Prefix for tool names (e.g., subdirectory name)
   */
  private scanNpmScripts(scanPath?: string, prefix?: string): Tool[] {
    const tools: Tool[] = [];
    const targetPath = scanPath || this.workspacePath;
    const packagePath = join(targetPath, 'package.json');

    if (!existsSync(packagePath)) return tools;

    try {
      const content = readFileSync(packagePath, 'utf-8');
      const pkg = JSON.parse(content);
      const pm = this.detectPackageManager();
      const displayPrefix = prefix ? `[${prefix}] ` : '';
      const cdPrefix = prefix ? `cd ${prefix} && ` : '';

      console.log('[Cortex ToolScanner] Found package.json at:', packagePath);

      if (pkg.scripts && typeof pkg.scripts === 'object') {
        for (const [name, script] of Object.entries(pkg.scripts)) {
          if (typeof script === 'string') {
            tools.push({
              name: `${displayPrefix}${name}`,
              command: `${cdPrefix}${pm} run ${name}`,
              category: 'npm',
              source: prefix ? `${prefix}/package.json` : 'package.json',
            });
          }
        }
        console.log(
          '[Cortex ToolScanner] Scripts found:',
          Object.keys(pkg.scripts).length,
          'in',
          prefix || 'root'
        );
      }
    } catch (error) {
      console.log('[Cortex ToolScanner] Error reading package.json:', error);
    }

    return tools;
  }

  /**
   * Scan Makefile for targets
   */
  private scanMakefile(scanPath?: string): Tool[] {
    const tools: Tool[] = [];
    const targetPath = scanPath || this.workspacePath;
    const makefilePath = join(targetPath, 'Makefile');

    if (!existsSync(makefilePath)) return tools;

    try {
      const content = readFileSync(makefilePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Match target definitions (name: dependencies)
        // Skip internal targets starting with .
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):/);
        if (match && !match[1].startsWith('.')) {
          tools.push({
            name: match[1],
            command: `make ${match[1]}`,
            category: 'make',
            source: 'Makefile',
          });
        }
      }
    } catch {
      // Read error, skip
    }

    return tools;
  }

  /**
   * Scan docker-compose.yml for services
   */
  private scanDockerCompose(scanPath?: string): Tool[] {
    const tools: Tool[] = [];
    const targetPath = scanPath || this.workspacePath;
    const composePaths = [
      join(targetPath, 'docker-compose.yml'),
      join(targetPath, 'docker-compose.yaml'),
      join(targetPath, 'compose.yml'),
      join(targetPath, 'compose.yaml'),
    ];

    const composePath = composePaths.find((p) => existsSync(p));
    if (!composePath) return tools;

    // Add common docker-compose commands
    const composeFile = basename(composePath);
    tools.push(
      { name: 'up', command: 'docker-compose up -d', category: 'docker', source: composeFile },
      { name: 'down', command: 'docker-compose down', category: 'docker', source: composeFile },
      { name: 'logs', command: 'docker-compose logs -f', category: 'docker', source: composeFile },
      { name: 'build', command: 'docker-compose build', category: 'docker', source: composeFile }
    );

    return tools;
  }

  /**
   * Scan for executable scripts in common locations
   */
  private scanScripts(scanPath?: string): Tool[] {
    const tools: Tool[] = [];
    const targetPath = scanPath || this.workspacePath;
    const scriptDirs = ['scripts', 'bin', '.scripts'];
    const scriptExtensions = ['.sh', '.ps1', '.bat', '.cmd'];

    for (const dir of scriptDirs) {
      const dirPath = join(targetPath, dir);
      if (!existsSync(dirPath)) continue;

      try {
        const files = readdirSync(dirPath);
        for (const file of files) {
          const ext = scriptExtensions.find((e) => file.endsWith(e));
          if (ext) {
            const name = file.replace(ext, '');
            const isWindows = process.platform === 'win32';
            const prefix =
              ext === '.ps1' ? 'powershell -File ' : ext === '.sh' && !isWindows ? 'bash ' : '';

            tools.push({
              name,
              command: `${prefix}${dir}/${file}`,
              category: 'script',
              source: `${dir}/${file}`,
            });
          }
        }
      } catch {
        // Read error, skip
      }
    }

    return tools;
  }
}
