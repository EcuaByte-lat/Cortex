/**
 * Cortex Auto-Installer
 *
 * Automatically configures Cortex MCP server for all supported AI editors:
 * - Cursor: ~/.cursor/mcp.json
 * - Windsurf: ~/.codeium/windsurf/mcp_config.json
 * - Claude Code: ~/.claude/settings.json
 * - VS Code: ~/.vscode/settings.json (or workspace)
 * - Zed: ~/.config/zed/settings.json
 * - JetBrains: (MCP Beta - manual for now)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

// Editor configuration paths
export interface EditorConfig {
  name: string;
  displayName: string;
  globalPath: string;
  projectPath?: string;
  configKey: string;
  format: 'mcp-servers' | 'cascade' | 'context-servers' | 'claude' | 'gemini';
  installed?: boolean;
}

const HOME = homedir();
const IS_WINDOWS = platform() === 'win32';
const IS_MAC = platform() === 'darwin';

// Get platform-specific paths
export function getEditorConfigs(): EditorConfig[] {
  return [
    {
      name: 'antigravity',
      displayName: 'Antigravity IDE',
      globalPath: join(HOME, '.gemini', 'antigravity', 'mcp_config.json'),
      configKey: 'mcpServers',
      format: 'gemini',
    },
    {
      name: 'gemini',
      displayName: 'Gemini CLI',
      globalPath: join(HOME, '.gemini', 'settings.json'),
      configKey: 'mcpServers',
      format: 'gemini',
    },
    {
      name: 'cursor',
      displayName: 'Cursor',
      globalPath: join(HOME, '.cursor', 'mcp.json'),
      projectPath: '.cursor/mcp.json',
      configKey: 'mcpServers',
      format: 'mcp-servers',
    },
    {
      name: 'windsurf',
      displayName: 'Windsurf (Codeium)',
      globalPath: join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
      configKey: 'mcpServers',
      format: 'cascade',
    },
    {
      name: 'claude',
      displayName: 'Claude Code',
      globalPath: join(HOME, '.claude', 'settings.json'),
      projectPath: '.claude/settings.json',
      configKey: 'mcpServers',
      format: 'claude',
    },
    {
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      globalPath: IS_MAC
        ? join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        : IS_WINDOWS
          ? join(process.env['APPDATA'] || '', 'Claude', 'claude_desktop_config.json')
          : join(HOME, '.config', 'Claude', 'claude_desktop_config.json'),
      configKey: 'mcpServers',
      format: 'mcp-servers',
    },
    {
      name: 'zed',
      displayName: 'Zed',
      globalPath: join(
        process.env['XDG_CONFIG_HOME'] || join(HOME, '.config'),
        'zed',
        'settings.json'
      ),
      projectPath: '.zed/settings.json',
      configKey: 'context_servers',
      format: 'context-servers',
    },
    {
      name: 'vscode',
      displayName: 'VS Code',
      globalPath: IS_MAC
        ? join(HOME, 'Library', 'Application Support', 'Code', 'User', 'settings.json')
        : IS_WINDOWS
          ? join(process.env['APPDATA'] || '', 'Code', 'User', 'settings.json')
          : join(HOME, '.config', 'Code', 'User', 'settings.json'),
      projectPath: '.vscode/settings.json',
      configKey: 'mcp.servers',
      format: 'mcp-servers',
    },
  ];
}

// Cortex MCP server configuration
function getCortexConfig(format: EditorConfig['format']): Record<string, unknown> {
  const baseConfig = {
    command: 'bunx',
    args: ['@ecuabyte/cortex-mcp-server'],
  };

  switch (format) {
    case 'mcp-servers':
    case 'claude':
    case 'cascade':
      return baseConfig;
    case 'gemini':
      // Gemini uses extended config with schema, trust, and description
      return {
        ...baseConfig,
        trust: true,
        description: 'Cortex engineering state and verified handoffs for coding agents',
      };
    case 'context-servers':
      // Zed uses a different format
      return {
        command: {
          path: 'bunx',
          args: ['@ecuabyte/cortex-mcp-server'],
        },
        settings: {},
      };
    default:
      return baseConfig;
  }
}

// Detect which editors are installed
export function detectInstalledEditors(): EditorConfig[] {
  const configs = getEditorConfigs();

  return configs.map((config) => ({
    ...config,
    installed: existsSync(dirname(config.globalPath)),
  }));
}

// Read existing config file safely
function readConfigFile(path: string): Record<string, unknown> {
  try {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      // Handle empty files
      if (!content.trim()) return {};
      return JSON.parse(content);
    }
  } catch (_e) {
    console.error(`Warning: Could not parse ${path}, creating new config`);
  }
  return {};
}

// Write config file with pretty formatting
function writeConfigFile(path: string, config: Record<string, unknown>): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
}

// Install Cortex for a specific editor
export function installForEditor(
  editor: EditorConfig,
  options: { global?: boolean; projectPath?: string } = { global: true }
): { success: boolean; message: string; path: string } {
  const configPath = options.global
    ? editor.globalPath
    : options.projectPath
      ? join(options.projectPath, editor.projectPath || '')
      : editor.globalPath;

  try {
    const existingConfig = readConfigFile(configPath);

    // Add Cortex configuration
    const cortexConfig = getCortexConfig(editor.format);

    // Handle different config structures
    if (editor.format === 'context-servers') {
      // Zed format
      if (!existingConfig['context_servers']) {
        existingConfig['context_servers'] = {};
      }
      (existingConfig['context_servers'] as Record<string, unknown>)['cortex-memory'] =
        cortexConfig;
    } else {
      // Standard MCP format
      const key = editor.configKey;
      const parts = key.split('.');

      let current = existingConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!part) continue; // Should not happen with split('.'), but satisfies TS

        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const lastKey = parts[parts.length - 1];
      if (lastKey) {
        if (!current[lastKey]) {
          current[lastKey] = {};
        }
        (current[lastKey] as Record<string, unknown>)['cortex'] = cortexConfig;
      }

      // Add $schema for Gemini settings.json
      if (editor.format === 'gemini') {
        existingConfig['$schema'] =
          'https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json';
      }
    }

    writeConfigFile(configPath, existingConfig);

    return {
      success: true,
      message: `✅ Cortex configured for ${editor.displayName}`,
      path: configPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to configure ${editor.displayName}: ${error instanceof Error ? error.message : String(error)}`,
      path: configPath,
    };
  }
}

// Install AGENTS.md or CLAUDE.md template - Enterprise Grade
export function installAgentsFile(
  projectPath: string,
  options: { type?: 'agents' | 'claude'; force?: boolean } = {}
): { success: boolean; message: string; path: string } {
  const fileName = options.type === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const filePath = join(projectPath, fileName);

  // Always overwrite to keep files up to date with latest best practices

  const claudeContent = `# Claude Code Instructions

> Generated by Cortex Memory System - ${new Date().toISOString().split('T')[0]}

## Core Principle: Evidence-First Engineering

**At the start of EVERY session, when the Cortex connector is available:**
\`\`\`
cortex_context("summary of current task")
\`\`\`

Review loaded context before writing any code. If unavailable, read docs/strategy/PRODUCT_DIRECTION.md and inspect the repository directly.

## Workflow Pattern

\`\`\`
EXPLORE → PLAN → CODE → VERIFY → COMMIT
\`\`\`

| Phase | Action |
|-------|--------|
| **Explore** | Read files, query memory, understand context |
| **Plan** | Use \`think hard\` or \`ultrathink\` for complex problems |
| **Code** | Incremental changes with \`git add -p\` checkpoints |
| **Verify** | Run tests after each logical change |
| **Commit** | Conventional commits, document "why" not "what" |

## Extended Thinking Modes

| Keyword | When to Use |
|---------|-------------|
| \`think\` | Simple decisions, quick reasoning |
| \`think hard\` | Complex logic, multi-file changes |
| \`ultrathink\` | Architecture decisions, security review |

## Structured Debugging Workflow

1. **Clear Bug Report**: Specific symptoms, not vague descriptions
2. **Read Code Carefully**: Follow data flow, don't assume
3. **List All Causes**: Generate hypotheses, not just fixes
4. **Rank by Likelihood**: Prioritize investigation order
5. **Test Fixes in Isolation**: One change at a time

## Adversarial Code Review

When reviewing, act as a critical senior developer:
\`\`\`
"Do a git diff and pretend you're a senior dev doing a code
review and you HATE this implementation. What would you
criticize? What edge cases am I missing?"
\`\`\`

## Context and Evidence Integration

| Event | Action |
|-------|--------|
| Architecture decision | \`cortex_add(type="decision")\` |
| Discovered pattern | \`cortex_add(type="code")\` |
| Configuration choice | \`cortex_add(type="config")\` |
| Important fact | \`cortex_add(type="fact")\` |
| Potential risk | document as \`note\` or \`decision\` until a dedicated risk type exists |

## File Imports (Monorepo Pattern)

Reference other docs with \`@path/to/file.md\` syntax:
\`\`\`markdown
@docs/architecture.md
@packages/core/README.md
\`\`\`

## Custom Commands

Create reusable prompts in \`.claude/commands/\`:
\`\`\`markdown
<!-- .claude/commands/fix-issue.md -->
Analyze issue #$ARGUMENTS and create a fix
\`\`\`

## XML Tags for Structure

\`\`\`xml
<context>Current task environment</context>
<instructions>Step-by-step goals</instructions>
<constraints>Must use existing patterns</constraints>
<output_format>Desired response structure</output_format>
\`\`\`

## Anti-Patterns (NEVER DO)

- ❌ Never assume context not in memory
- ❌ Never claim that \`cortex_context\` was queried when the connector is unavailable
- ❌ Never commit without running tests
- ❌ Never use \`any\` type - use \`unknown\`
- ❌ Never log secrets or PII
- ❌ Never over-engineer - keep changes focused
- ❌ Never refactor beyond what was asked

## Security Practices

- Use \`/security-review\` for vulnerability analysis
- Block risky operations on \`.env\` and \`.git/\`
- Validate inputs before processing
- Never expose credentials in logs or errors
`;

  const agentsContent = `# Context Workflow Protocol

> Generated by Cortex Memory System - ${new Date().toISOString().split('T')[0]}

## Constitutional Principles

1. **Context First** - Query \`cortex_context\` before decisions when available; otherwise inspect the canonical strategy and repository state
2. **Document Why** - Save reasoning, not just choices
3. **Verify Before Change** - Check existing patterns first
4. **Incremental Progress** - Small commits, frequent checkpoints
5. **Zero Secrets** - Never log, commit, or transmit secrets/PII
6. **Single Responsibility** - One clear purpose per task
7. **Plan Before Code** - Outline approach, get approval, then implement

## Context Roles (Infrastructure Modes)

### 1. Onboarding Protocol
**Purpose:** Accelerated Context Loading
- Queries Shared Knowledge Graph to explain *why* code exists
- References architectural decisions from memory
- Points to relevant documentation

### 2. Review Guardrails
**Purpose:** Semantic Drift Prevention
- Queries Decision Trail before reviewing
- Flags "Semantic Drift" when code evolves away from truths
- Uses adversarial review: "What would a senior dev criticize?"

### 3. Tech Debt Radar
**Purpose:** Pattern Matching
- Scans for patterns violating Architecture Guardrails
- Logs violations as a documented risk using a supported record type until a dedicated risk type exists
- Prioritizes by impact and effort

### 4. Security Audit
**Purpose:** Vulnerability Analysis
- Runs \`/security-review\` on changes
- Checks for OWASP Top 10 issues
- Validates input handling and auth flows

## Workflow Definitions

Define workflows in \`.claude/workflows/\`:
\`\`\`yaml
# .claude/workflows/review.yaml
name: Code Review
description: Reviews code for bugs and style
steps: [Read, Search, Analysis]
\`\`\`

**Pattern:** Human leads, Infrastructure supports.

## Hooks Configuration

Configure in \`.claude/settings.json\`:
\`\`\`json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "command": "echo 'Validating...' && biome check"
    }],
    "PostToolUse": [{
      "matcher": "Write",
      "command": "biome format --write"
    }]
  }
}
\`\`\`

## Context Protocol

\`\`\`javascript
cortex_context("summary of current task")
\`\`\`

| Event | Memory Type |
|-------|-------------|
| Decisions | \`decision\` |
| Patterns | \`code\` |
| Facts | \`fact\` |
| Risks | \`note\` or \`decision\` until a dedicated risk type exists |

## Session Management

- \`claude --resume\` to continue previous session
- \`/clear\` to reset context for new task
- Session history stored locally for retrospective

## MCP Tools

| Tool | Purpose |
|------|---------|
| \`cortex_context\` | Load task-relevant memories |
| \`cortex_add\` | Save new memory |
| \`cortex_search\` | Query existing memories |
`;

  const content = options.type === 'claude' ? claudeContent : agentsContent;

  try {
    writeFileSync(filePath, content);
    return {
      success: true,
      message: `✅ Created ${fileName}`,
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to create ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      path: filePath,
    };
  }
}

// Install .cursorrules - Enterprise Grade
export function installCursorRules(
  projectPath: string,
  _options: { force?: boolean } = {}
): { success: boolean; message: string; path: string } {
  const fileName = '.cursorrules';
  const filePath = join(projectPath, fileName);

  // Always overwrite to keep files up to date with latest best practices

  const content = `# Cursor Rules - Cortex Engineering State

> Generated by Cortex Memory System

## Priority 1: Evidence-First Development

At the start of EVERY task, when available:
\`\`\`
cortex_context("summary of current task")
\`\`\`

## Priority 2: Workflow Pattern

\`\`\`
EXPLORE → PLAN → CODE → VERIFY → COMMIT
\`\`\`

- **Explore**: Read relevant files before making changes
- **Plan**: Use \`think hard\` for complex problems
- **Code**: Incremental changes with git checkpoints
- **Verify**: Run tests after each change
- **Commit**: conventional commits with "why"

## Priority 3: Save Knowledge

Always save important decisions:
- \`cortex_add(content="...", type="decision")\`
- \`cortex_add(content="...", type="code")\`
- \`cortex_add(content="...", type="fact")\`

## Extended Thinking

Use these keywords for complex reasoning:
- \`think\` → Basic deliberation
- \`think hard\` → Deeper analysis
- \`ultrathink\` → Maximum reasoning

## Anti-Patterns

- ❌ Never claim that cortex_context was queried when the connector is unavailable
- ❌ Never assume context not in memory
- ❌ Never commit without tests
- ❌ Never log secrets or PII
`;

  try {
    writeFileSync(filePath, content);
    return {
      success: true,
      message: `✅ Created ${fileName}`,
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to create ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      path: filePath,
    };
  }
}

// Install Universal Rules - Native files for ALL AI tools
export function installUniversalRules(projectPath: string): {
  results: Array<{ tool: string; success: boolean; message: string; path: string }>;
} {
  const results: Array<{ tool: string; success: boolean; message: string; path: string }> = [];
  const date = new Date().toISOString().split('T')[0];

  // 1. GitHub Copilot - .github/copilot-instructions.md
  const copilotDir = join(projectPath, '.github');
  const copilotPath = join(copilotDir, 'copilot-instructions.md');
  const copilotContent = `# GitHub Copilot Instructions

> Generated by Cortex Memory System - ${date}

## Project Overview
Cortex preserves evidence-backed engineering state for reliable handoffs across coding agents.

## Coding Guidelines

### Context and Evidence Integration
- Query \`cortex_context\` before implementing features when available
- Otherwise read docs/strategy/PRODUCT_DIRECTION.md
- Save architectural decisions with \`cortex_add\`
- Document "why" not just "what" in commits

### Workflow
1. **Explore** - Read relevant files first
2. **Plan** - Think through approach before coding
3. **Code** - Incremental changes with checkpoints
4. **Verify** - Run tests after each change
5. **Commit** - Conventional commits (feat:, fix:, chore:)

### Code Style
- Follow project coding conventions
- Use descriptive variable names
- Write tests for new features
- Keep functions focused and small

### Anti-Patterns
- Never log secrets or PII
- Never commit without tests
- Never skip code review
- Never hardcode credentials
`;

  try {
    if (!existsSync(copilotDir)) {
      mkdirSync(copilotDir, { recursive: true });
    }
    writeFileSync(copilotPath, copilotContent);
    results.push({
      tool: 'Copilot',
      success: true,
      message: '✅ Created copilot-instructions.md',
      path: copilotPath,
    });
  } catch (error) {
    results.push({
      tool: 'Copilot',
      success: false,
      message: `❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      path: copilotPath,
    });
  }

  // 2. Windsurf - .windsurfrules
  const windsurfPath = join(projectPath, '.windsurfrules');
  const windsurfContent = `# Windsurf AI Rules - Cortex Engineering State

> Generated by Cortex Memory System - ${date}

## Context Protocol
Start with cortex_context("current task summary") when available. Otherwise read docs/strategy/PRODUCT_DIRECTION.md.
Save decisions with: cortex_add(content, type)

## Workflow
EXPLORE → PLAN → CODE → VERIFY → COMMIT

## Coding Standards
- Follow project conventions
- Use descriptive names
- Conventional commits (feat:, fix:, chore:)
- Run tests before committing

## Security
- Never log secrets or PII
- Validate all inputs
- Use environment variables for config

## Extended Thinking
- "think" for simple decisions
- "think hard" for complex logic
- "ultrathink" for architecture decisions
`;

  try {
    writeFileSync(windsurfPath, windsurfContent);
    results.push({
      tool: 'Windsurf',
      success: true,
      message: '✅ Created .windsurfrules',
      path: windsurfPath,
    });
  } catch (error) {
    results.push({
      tool: 'Windsurf',
      success: false,
      message: `❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      path: windsurfPath,
    });
  }

  // 3. Cursor MDC - .cursor/rules/cortex.mdc
  const cursorRulesDir = join(projectPath, '.cursor', 'rules');
  const cursorMdcPath = join(cursorRulesDir, 'cortex.mdc');
  const cursorMdcContent = `---
description: Cortex engineering state and verified handoffs for AI-assisted development
globs: ["**/*"]
alwaysApply: true
---

# Cortex Handoff Protocol

## Evidence-First Development

At session start, when available: \`cortex_context("task summary")\`
Save decisions: \`cortex_add(content, type)\`

## Workflow

\`\`\`
EXPLORE → PLAN → CODE → VERIFY → COMMIT
\`\`\`

## Extended Thinking

| Keyword | Use Case |
|---------|----------|
| think | Simple decisions |
| think hard | Complex logic |
| ultrathink | Architecture |

## Rules

- Query project context before implementing
- Save architectural decisions
- Use conventional commits
- Never log secrets or PII
`;

  try {
    if (!existsSync(cursorRulesDir)) {
      mkdirSync(cursorRulesDir, { recursive: true });
    }
    writeFileSync(cursorMdcPath, cursorMdcContent);
    results.push({
      tool: 'Cursor MDC',
      success: true,
      message: '✅ Created cortex.mdc',
      path: cursorMdcPath,
    });
  } catch (error) {
    results.push({
      tool: 'Cursor MDC',
      success: false,
      message: `❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      path: cursorMdcPath,
    });
  }

  // 4. Cody - .vscode/cody.json
  const vscodeDir = join(projectPath, '.vscode');
  const codyPath = join(vscodeDir, 'cody.json');
  const codyConfig = {
    commands: {
      'cortex-context': {
        prompt: 'Query Cortex project state relevant to: $ARGUMENTS',
        context: { selection: true },
      },
      'cortex-save': {
        prompt: 'Save this engineering decision to Cortex with evidence, scope, and tags',
        context: { selection: true },
      },
    },
    settings: {
      'cody.chat.preInstruction':
        'Cortex preserves evidence-backed engineering state for reliable handoffs. Start sessions with cortex_context() when available, save decisions with cortex_add(), and follow: EXPLORE → PLAN → CODE → VERIFY → COMMIT.',
    },
  };

  try {
    if (!existsSync(vscodeDir)) {
      mkdirSync(vscodeDir, { recursive: true });
    }
    writeFileSync(codyPath, JSON.stringify(codyConfig, null, 2));
    results.push({ tool: 'Cody', success: true, message: '✅ Created cody.json', path: codyPath });
  } catch (error) {
    results.push({
      tool: 'Cody',
      success: false,
      message: `❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      path: codyPath,
    });
  }

  return { results };
}

// Install Claude Code hooks
export function installClaudeHooks(
  options: { global?: boolean; projectPath?: string } = { global: true }
): { success: boolean; message: string; path: string } {
  const configPath = options.global
    ? join(HOME, '.claude', 'settings.json')
    : join(options.projectPath || '.', '.claude', 'settings.json');

  try {
    const existingConfig = readConfigFile(configPath);

    // Add hooks configuration
    if (!existingConfig['hooks']) {
      existingConfig['hooks'] = {};
    }

    const hooks = existingConfig['hooks'] as Record<string, unknown[]>;

    // PostToolUse hook for auto-memory
    if (!hooks['PostToolUse']) {
      hooks['PostToolUse'] = [];
    }

    // Check if cortex hook already exists
    const postHooks = hooks['PostToolUse'] as Array<{ matcher?: string; command?: string }>;
    const hasCorTexHook = postHooks.some(
      (h) => h.command?.includes('cortex') || h.matcher?.includes('cortex')
    );

    if (!hasCorTexHook) {
      postHooks.push({
        matcher: 'Write|Edit|Create|Bash',
        command:
          'echo "Action completed: $TOOL_NAME" | bunx @ecuabyte/cortex-mcp-server --auto-save 2>/dev/null || true',
      });
    }

    writeConfigFile(configPath, existingConfig);

    return {
      success: true,
      message: `✅ Claude Code hooks configured`,
      path: configPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to configure hooks: ${error instanceof Error ? error.message : String(error)}`,
      path: configPath,
    };
  }
}

export function installCodexHooks(
  options: { global?: boolean; projectPath?: string } = { global: true }
): { success: boolean; message: string; path: string } {
  const configPath = options.global
    ? join(HOME, '.codex', 'hooks.json')
    : options.projectPath
      ? join(options.projectPath, '.codex', 'hooks.json')
      : join(HOME, '.codex', 'hooks.json');

  try {
    const config = readConfigFile(configPath);
    const hooks = config as Record<string, unknown>;
    const bridgeCommand = 'cortex bridge ingest --provider codex';
    const events: Array<{ name: string; matcher?: string }> = [
      { name: 'SessionStart' },
      { name: 'UserPromptSubmit' },
      { name: 'PostToolUse', matcher: 'Bash|apply_patch|Edit|Write' },
      { name: 'PostToolUseFailure', matcher: 'Bash|apply_patch|Edit|Write' },
      { name: 'PreCompact' },
      { name: 'PostCompact' },
      { name: 'SessionEnd' },
    ];

    for (const event of events) {
      const entries = Array.isArray(hooks[event.name]) ? (hooks[event.name] as unknown[]) : [];
      const hasBridge = entries.some((entry) => JSON.stringify(entry).includes(bridgeCommand));
      if (!hasBridge) {
        entries.push({
          ...(event.matcher ? { matcher: event.matcher } : {}),
          hooks: [
            {
              type: 'command',
              command: bridgeCommand,
              ...(event.name === 'SessionEnd' ? { timeout: 3 } : {}),
            },
          ],
        });
      }
      hooks[event.name] = entries;
    }

    writeConfigFile(configPath, config);
    return { success: true, message: '✅ Codex Agent Bridge hooks configured', path: configPath };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to configure Codex hooks: ${error instanceof Error ? error.message : String(error)}`,
      path: configPath,
    };
  }
}

export function installOpenCodePlugin(projectPath: string): {
  success: boolean;
  message: string;
  path: string;
} {
  const pluginPath = join(projectPath, '.opencode', 'plugins', 'cortex.ts');
  const content = `import type { Plugin } from '@opencode-ai/plugin';

const captureTypes = new Set([
  'session.created',
  'session.idle',
  'session.compacted',
  'session.deleted',
  'file.edited',
  'command.executed',
  'tui.prompt.append',
]);

async function emit(event: Record<string, unknown>, directory: string) {
  const process = Bun.spawn(['cortex', 'bridge', 'ingest', '--provider', 'opencode'], {
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await process.stdin.write(JSON.stringify({ ...event, cwd: directory, directory }));
  process.stdin.end();
  await process.exited;
}

export const CortexAgentBridge: Plugin = async ({ directory }) => ({
  event: async ({ event }) => {
    if (captureTypes.has(event.type)) {
      await emit(event as unknown as Record<string, unknown>, directory);
    }
  },
  'tool.execute.after': async (input, output) => {
    const toolInput = input as unknown as Record<string, unknown>;
    await emit(
      {
        type: 'tool.execute.after',
        properties: {
          id: toolInput['callID'] ?? toolInput['callId'],
          sessionID: toolInput['sessionID'] ?? toolInput['sessionId'],
          tool: toolInput['tool'],
          input: toolInput,
          output,
        },
      },
      directory
    );
  },
});
`;

  try {
    writeFileSync(pluginPath, content);
    return {
      success: true,
      message: '✅ OpenCode Agent Bridge plugin configured',
      path: pluginPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to configure OpenCode plugin: ${error instanceof Error ? error.message : String(error)}`,
      path: pluginPath,
    };
  }
}

// Full installation for all detected editors
export function installAll(
  options: { global?: boolean; projectPath?: string } = { global: true }
): {
  results: Array<{ editor: string; success: boolean; message: string; path: string }>;
  summary: { total: number; success: number; failed: number };
} {
  const editors = detectInstalledEditors().filter((e) => e.installed || options.projectPath);
  const results: Array<{ editor: string; success: boolean; message: string; path: string }> = [];

  for (const editor of editors) {
    const result = installForEditor(editor, options);
    results.push({
      editor: editor.displayName,
      ...result,
    });
  }

  // Also create AGENTS.md if installing for project
  if (options.projectPath) {
    const agentsResult = installAgentsFile(options.projectPath);
    results.push({
      editor: 'AGENTS.md',
      ...agentsResult,
    });

    // Create .cursorrules
    const cursorResult = installCursorRules(options.projectPath);
    results.push({
      editor: '.cursorrules',
      ...cursorResult,
    });

    // Create CLAUDE.md
    const claudeResult = installAgentsFile(options.projectPath, { type: 'claude' });
    results.push({
      editor: 'CLAUDE.md',
      ...claudeResult,
    });

    // Create native rule files for ALL AI tools
    const universalResults = installUniversalRules(options.projectPath);
    for (const result of universalResults.results) {
      results.push({
        editor: result.tool,
        success: result.success,
        message: result.message,
        path: result.path,
      });
    }

    const codexResult = installCodexHooks({ projectPath: options.projectPath, global: false });
    results.push({ editor: 'Codex hooks', ...codexResult });

    const openCodeResult = installOpenCodePlugin(options.projectPath);
    results.push({ editor: 'OpenCode plugin', ...openCodeResult });
  }

  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    results,
    summary: {
      total: results.length,
      success,
      failed,
    },
  };
}

// Ensure configuration runs once
export async function ensureFirstRun(): Promise<boolean> {
  try {
    // Config state paths
    const configDir = join(homedir(), '.cortex');
    const markerFile = join(configDir, 'configured');

    // Allow skipping via env
    if (process.env['CORTEX_SKIP_SETUP']) return false;

    // Check if already configured
    if (existsSync(markerFile)) return false;

    // Create config dir
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Run installation
    const { results, summary } = installAll({ global: true });

    if (summary.success > 0) {
      console.log('\n🧠 Cortex First Run: Auto-configured editors');
      for (const r of results) {
        if (r.success) console.log(`   ${r.message}`);
      }
      console.log('');
    }

    // Mark as configured
    writeFileSync(markerFile, new Date().toISOString());
    return true;
  } catch (_e) {
    return false;
  }
}

// Export for CLI
export default {
  detectInstalledEditors,
  installForEditor,
  installAgentsFile,
  installCursorRules,
  installUniversalRules,
  installClaudeHooks,
  installCodexHooks,
  installOpenCodePlugin,
  installAll,
  getEditorConfigs,
  ensureFirstRun,
};
