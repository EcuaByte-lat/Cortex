import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { join } from 'node:path';
import {
  detectInstalledEditors,
  type EditorConfig,
  ensureFirstRun,
  getEditorConfigs,
  installAgentsFile,
  installAll,
  installClaudeHooks,
  installCodexHooks,
  installCursorRules,
  installForEditor,
  installOpenCodePlugin,
} from './installer';

// Mock fs
const fsMocks = {
  existsSync: mock((_path: string) => false),
  mkdirSync: mock((_path: string, _options?: unknown) => undefined),
  readFileSync: mock((_path: string, _encoding?: string) => '{}'),
  writeFileSync: mock((_path: string, _content: string) => undefined),
};

mock.module('node:fs', () => fsMocks);

mock.module('node:os', () => ({
  homedir: () => '/mock/home',
  platform: () => 'linux',
}));

describe('Cortex Installer', () => {
  beforeEach(() => {
    // Reset mocks default behavior
    fsMocks.existsSync.mockImplementation(() => false);
    fsMocks.readFileSync.mockImplementation(() => '{}');
    fsMocks.writeFileSync.mockClear();
    fsMocks.writeFileSync.mockImplementation(() => undefined);
    fsMocks.mkdirSync.mockClear();
    fsMocks.mkdirSync.mockImplementation(() => undefined);
  });

  afterAll(() => {
    // Restore all mocks to prevent contamination of other test files
    mock.restore();
  });

  describe('detectInstalledEditors', () => {
    it('should detect editors based on global config existence', () => {
      fsMocks.existsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.cursor')) return true;
        return false;
      });

      const editors = detectInstalledEditors();
      const cursor = editors.find((e) => e.name === 'cursor');
      const vscode = editors.find((e) => e.name === 'vscode');

      expect(cursor?.installed).toBe(true);
      expect(vscode?.installed).toBe(false);
    });
  });

  describe('installForEditor', () => {
    it('should configure standard MCP editor (Cursor)', () => {
      let writtenFile = '';
      let writtenContent = '';

      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.readFileSync.mockImplementation(() => '{"old": "config"}');
      fsMocks.writeFileSync.mockImplementation((f: string, c: string) => {
        writtenFile = f;
        writtenContent = c;
      });

      const cursorConfig = getEditorConfigs().find((e) => e.name === 'cursor') as EditorConfig;
      const result = installForEditor(cursorConfig);

      expect(result.success).toBe(true);
      expect(writtenFile).toContain(join('.cursor', 'mcp.json'));

      const parsed = JSON.parse(writtenContent);
      expect(parsed.mcpServers.cortex).toBeDefined();
      expect(parsed.mcpServers.cortex.command).toBe('bunx');
      expect(parsed.old).toBe('config'); // Preserves existing
    });

    it('should configure Zed (context-servers)', () => {
      let writtenContent = '';
      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.writeFileSync.mockImplementation((_: string, c: string) => {
        writtenContent = c;
      });

      const zedConfig = getEditorConfigs().find((e) => e.name === 'zed') as EditorConfig;
      const result = installForEditor(zedConfig);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(writtenContent);
      expect(parsed.context_servers['cortex-memory']).toBeDefined();
      expect(parsed.context_servers['cortex-memory'].command.path).toBe('bunx');
    });

    it('should handle malformed config file by creating new one', () => {
      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.readFileSync.mockImplementation(() => '{ invalid json'); // Malformed

      let writtenContent = '';
      fsMocks.writeFileSync.mockImplementation((_: string, c: string) => {
        writtenContent = c;
      });

      const cursorConfig = getEditorConfigs().find((e) => e.name === 'cursor') as EditorConfig;
      const result = installForEditor(cursorConfig);

      expect(result.success).toBe(true);
      expect(result.message).toContain('configured');
      const parsed = JSON.parse(writtenContent);
      expect(parsed.mcpServers.cortex).toBeDefined();
    });

    it('should handle write errors gracefully', () => {
      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      const cursorConfig = getEditorConfigs().find((e) => e.name === 'cursor') as EditorConfig;
      const result = installForEditor(cursorConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to configure');
    });

    it('should Create nested keys if missing', () => {
      // e.g. .vscode/settings.json might be empty, we need to create mcp.servers
      let writtenContent = '';
      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.readFileSync.mockImplementation(() => '{}');
      fsMocks.writeFileSync.mockImplementation((_: string, c: string) => {
        writtenContent = c;
      });

      const vscodeConfig = getEditorConfigs().find((e) => e.name === 'vscode') as EditorConfig;
      const result = installForEditor(vscodeConfig);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(writtenContent);
      expect(parsed.mcp).toBeDefined();
      expect(parsed.mcp.servers).toBeDefined();
      expect(parsed.mcp.servers.cortex).toBeDefined();
    });
  });

  describe('installAgentsFile', () => {
    it('should create AGENTS.md if missing', () => {
      let writtenPath = '';
      fsMocks.existsSync.mockImplementation(() => false);
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        writtenPath = p;
      });

      const result = installAgentsFile('/test/project');

      expect(result.success).toBe(true);
      expect(writtenPath).toContain('AGENTS.md');
    });

    it('should preserve existing files unless forced', () => {
      fsMocks.existsSync.mockImplementation(() => true);
      const result = installAgentsFile('/test/project');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Preserved');
    });

    it('should overwrite if forced', () => {
      fsMocks.existsSync.mockImplementation(() => true);
      const result = installAgentsFile('/test/project', { force: true });
      expect(result.success).toBe(true);
    });

    it('should create CLAUDE.md when requested', () => {
      let writtenPath = '';
      fsMocks.existsSync.mockImplementation(() => false);
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        writtenPath = p;
      });

      const result = installAgentsFile('/test/project', { type: 'claude' });
      expect(result.success).toBe(true);
      expect(writtenPath).toContain('CLAUDE.md');
    });

    it('should handle write errors', () => {
      fsMocks.existsSync.mockImplementation(() => false);
      fsMocks.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      const result = installAgentsFile('/test/project');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });
  });

  describe('installCursorRules', () => {
    it('should create .cursorrules if missing', () => {
      let writtenPath = '';
      let writtenContent = '';
      fsMocks.existsSync.mockImplementation(() => false);
      fsMocks.writeFileSync.mockImplementation((p: string, c: string) => {
        writtenPath = p;
        writtenContent = c;
      });

      const result = installCursorRules('/test/project');

      expect(result.success).toBe(true);
      expect(writtenPath).toContain('.cursorrules');
      expect(writtenContent).toContain('Evidence-First');
    });

    it('should preserve existing files unless forced', () => {
      fsMocks.existsSync.mockImplementation(() => true);
      const result = installCursorRules('/test/project');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Preserved');
    });

    it('should overwrite if forced', () => {
      fsMocks.existsSync.mockImplementation(() => true);
      const result = installCursorRules('/test/project', { force: true });
      expect(result.success).toBe(true);
    });

    it('should handle write errors', () => {
      fsMocks.existsSync.mockImplementation(() => false);
      fsMocks.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      const result = installCursorRules('/test/project');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });
  });

  describe('installUniversalRules', () => {
    // Import function (since it might not be in the initial import set)
    const { installUniversalRules } = require('./installer');

    interface InstallResult {
      tool: string;
      success: boolean;
      message: string;
      path: string;
    }

    it('should create all native config files', () => {
      const writtenFiles: string[] = [];
      fsMocks.existsSync.mockImplementation(() => false);
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        writtenFiles.push(p.toString());
      });
      fsMocks.mkdirSync.mockImplementation(() => undefined);

      const { results } = installUniversalRules('/test/project');

      expect(results).toHaveLength(4);
      expect(writtenFiles.some((f) => f.includes('copilot-instructions.md'))).toBe(true);
      expect(writtenFiles.some((f) => f.includes('.windsurfrules'))).toBe(true);
      expect(writtenFiles.some((f) => f.includes('cortex.mdc'))).toBe(true);
      expect(writtenFiles.some((f) => f.includes('cody.json'))).toBe(true);
      expect(results.every((r: InstallResult) => r.success)).toBe(true);
    });

    it('should handle write errors for Copilot', () => {
      fsMocks.writeFileSync.mockImplementationOnce((p: string) => {
        if (p.includes('copilot')) throw new Error('Copilot Write Fail');
      });
      const { results } = installUniversalRules('/test/project');
      const copilot = results.find((r: InstallResult) => r.tool === 'Copilot');
      expect(copilot.success).toBe(false);
      expect(copilot.message).toContain('Failed');
    });

    it('should handle write errors for Windsurf', () => {
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        if (p.includes('windsurf')) throw new Error('Windsurf Write Fail');
      });
      const { results } = installUniversalRules('/test/project');
      const windsurf = results.find((r: InstallResult) => r.tool === 'Windsurf');
      expect(windsurf.success).toBe(false);
    });

    it('should handle write errors for Cursor MDC', () => {
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        if (p.includes('matches nothing')) return; // ignore others
        if (p.includes('mdc')) throw new Error('MDC Write Fail');
      });
      const { results } = installUniversalRules('/test/project');
      const mdc = results.find((r: InstallResult) => r.tool === 'Cursor MDC');
      expect(mdc.success).toBe(false);
    });

    it('should handle write errors for Cody', () => {
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        if (p.includes('cody')) throw new Error('Cody Write Fail');
      });
      const { results } = installUniversalRules('/test/project');
      const cody = results.find((r: InstallResult) => r.tool === 'Cody');
      expect(cody.success).toBe(false);
    });
  });

  describe('installClaudeHooks', () => {
    it('should add hooks to existing config', () => {
      let writtenContent = '';
      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.readFileSync.mockImplementation(() => '{"hooks": {"PostToolUse": []}}');
      fsMocks.writeFileSync.mockImplementation((_: string, c: string) => {
        writtenContent = c;
      });

      const result = installClaudeHooks({ global: true });

      expect(result.success).toBe(true);
      const parsed = JSON.parse(writtenContent);
      expect(parsed.hooks.PostToolUse).toHaveLength(1);
      expect(parsed.hooks.PostToolUse[0].hooks[0].command).toContain('cortex bridge ingest');
    });

    it('should create hooks structure if missing', () => {
      let writtenContent = '';
      fsMocks.existsSync.mockImplementation(() => true);
      fsMocks.readFileSync.mockImplementation(() => '{}');
      fsMocks.writeFileSync.mockImplementation((_: string, c: string) => {
        writtenContent = c;
      });

      const result = installClaudeHooks();

      expect(result.success).toBe(true);
      const parsed = JSON.parse(writtenContent);
      expect(parsed.hooks).toBeDefined();
      expect(parsed.hooks.PostToolUse).toBeDefined();
    });

    it('should not duplicate hook if already exists', () => {
      let writtenContent = '';
      fsMocks.existsSync.mockImplementation(() => true);
      // Simulate existing hook
      fsMocks.readFileSync.mockImplementation(() =>
        JSON.stringify({
          hooks: {
            PostToolUse: [
              {
                matcher: 'Write|Edit',
                hooks: [{ type: 'command', command: 'cortex bridge ingest --provider claude' }],
              },
            ],
          },
        })
      );
      fsMocks.writeFileSync.mockImplementation((_: string, c: string) => {
        writtenContent = c;
      });

      const result = installClaudeHooks();
      expect(result.success).toBe(true);
      // Hook count should remain 1
      const parsed = JSON.parse(writtenContent);
      expect(parsed.hooks.PostToolUse).toHaveLength(1);
    });

    it('should handle errors', () => {
      fsMocks.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      const result = installClaudeHooks();
      expect(result.success).toBe(false);
    });
  });

  describe('installAll', () => {
    it('should install for multiple editors', () => {
      // Mock detection finding cursor
      // We mock existsSync to return true for Cursor config path, false others
      fsMocks.existsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.cursor')) return true;
        return false;
      });

      const { results, summary } = installAll();

      expect(summary.total).toBeGreaterThan(0);
      // Cursor should be successful
      const cursorResult = results.find((r) => r.editor === 'Cursor');
      expect(cursorResult?.success, `Failed to install Cursor: ${cursorResult?.message}`).toBe(
        true
      );
    });

    it('should include agents file if project path provided', () => {
      fsMocks.existsSync.mockImplementation(() => false); // clean slate for agents file check

      const { results } = installAll({ projectPath: '/tmp/project', global: false });

      const agentFile = results.find((r) => r.editor === 'AGENTS.md');
      expect(agentFile).toBeDefined();
      expect(agentFile?.success).toBe(true);

      const cursorRules = results.find((r) => r.editor === '.cursorrules');
      expect(cursorRules).toBeDefined();
      expect(cursorRules?.success).toBe(true);

      const claudeMd = results.find((r) => r.editor === 'CLAUDE.md');
      expect(claudeMd).toBeDefined();
      expect(claudeMd?.success).toBe(true);
    });
  });

  describe('agent bridge adapters', () => {
    it('uses project instructions for Codex instead of inventing an unsupported hooks file', () => {
      const result = installCodexHooks({ projectPath: '/tmp/project' });

      expect(result.success).toBe(true);
      expect(result.path).toContain('AGENTS.md');
      expect(result.message).toContain('MCP');
    });

    it('writes a project OpenCode plugin for lifecycle capture', () => {
      let writtenFile = '';
      let writtenContent = '';
      fsMocks.writeFileSync.mockImplementation((file: string, content: string) => {
        writtenFile = file;
        writtenContent = content;
      });

      const result = installOpenCodePlugin('/tmp/project');

      expect(result.success).toBe(true);
      expect(writtenFile).toContain(join('.opencode', 'plugins', 'cortex.ts'));
      expect(writtenContent).toContain('CortexAgentBridge');
      expect(writtenContent).toContain('tool.execute.after');
    });
  });

  describe('ensureFirstRun', () => {
    it('should skip if CORTEX_SKIP_SETUP is set', async () => {
      process.env['CORTEX_SKIP_SETUP'] = '1';
      const result = await ensureFirstRun();
      expect(result).toBe(false);
      process.env['CORTEX_SKIP_SETUP'] = ''; // cleanup
    });

    it('should skip if marker file exists', async () => {
      fsMocks.existsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('configured')) return true;
        return false;
      });
      const result = await ensureFirstRun();
      expect(result).toBe(false);
    });

    it('should run installation if fresh', async () => {
      let writtenMarker = false;
      fsMocks.existsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('configured')) return false;
        if (typeof p === 'string' && p.includes('.cursor')) return true; // Simulate installed editor for log coverage
        return false;
      });
      fsMocks.writeFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('configured')) writtenMarker = true;
      });

      const result = await ensureFirstRun();
      expect(result).toBe(true);
      expect(writtenMarker).toBe(true);
    });

    it.skip('should handle errors gracefully', async () => {
      fsMocks.existsSync.mockImplementation(() => false);
      // throw in mkdir or write
      fsMocks.mkdirSync.mockImplementationOnce(() => {
        throw new Error('Root fail');
      });

      const result = await ensureFirstRun();
      expect(result).toBe(false);
    });
  });
});
