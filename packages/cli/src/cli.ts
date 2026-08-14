#!/usr/bin/env bun
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  AgentBridge,
  ContinuityStore,
  createEmbeddingProvider,
  type Memory,
  MemoryStore,
  renderContinuityHandoffMarkdown,
  type SemanticSearchResult,
} from '@ecuabyte/cortex-core';
import { MEMORY_TYPES } from '@ecuabyte/cortex-shared';
import { Command } from 'commander';
import { type AgentProvider, normalizeAgentPayload } from './agent-adapters.js';
import { parseBridgeInput } from './bridge-input.js';
import { deriveProjectId, getRepositoryContext } from './continuity.js';

const program = new Command();
const store = new MemoryStore();
const continuityStore = new ContinuityStore();

// First-run auto-configuration
(async () => {
  const { ensureFirstRun } = await import('./installer.js');
  await ensureFirstRun();
})();

// Initialize embedding provider if available
let embeddingAvailable = false;
(async () => {
  try {
    const provider = await createEmbeddingProvider({
      openaiApiKey: process.env['OPENAI_API_KEY'],
    });
    if (provider) {
      store.setEmbeddingProvider(provider);
      embeddingAvailable = true;
    }
  } catch {
    // No embedding provider available
  }
})();

program
  .name('cortex')
  .description('Evidence-backed engineering state and handoffs for coding agents')
  .version('0.8.2');

// Add memory
program
  .command('add')
  .description('Add a new memory')
  .requiredOption('-c, --content <text>', 'Memory content')
  .requiredOption(`-t, --type <type>', 'Memory type (${Object.values(MEMORY_TYPES).join('|')})`)
  .requiredOption('-s, --source <source>', 'Source (file, url, conversation, etc)')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options) => {
    try {
      const id = await store.add({
        content: options.content,
        type: options.type,
        source: options.source,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
      });
      console.log(`✓ Memory added (ID: ${id})`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Search memories
program
  .command('search <query>')
  .description('Search memories by content')
  .option('-t, --type <type>', 'Filter by type')
  .option('-l, --limit <number>', 'Max results', '10')
  .option('--semantic', 'Use semantic (AI) search (requires Ollama or OpenAI)')
  .action(async (query, options) => {
    const limit = parseInt(options.limit, 10);
    let results: Memory[] | undefined;
    let searchMode = 'keyword';

    if (options.semantic) {
      if (!embeddingAvailable) {
        console.log(
          '⚠️  Semantic search requires Ollama or OPENAI_API_KEY. Falling back to keyword search.'
        );
      } else {
        const semanticResults: SemanticSearchResult[] = await store.searchSemantic(query, {
          type: options.type,
          limit,
          minScore: 0.3,
        });
        results = semanticResults.map((r) => r.memory);
        searchMode = 'semantic';
      }
    }

    // Fallback or default keyword search
    if (!results) {
      results = await store.search(query, {
        type: options.type,
        limit,
      });
    }

    if (!results || results.length === 0) {
      console.log(`No memories found (${searchMode} search).`);
      return;
    }

    console.log(`\nFound ${results.length} memories (${searchMode} search):\n`);
    results.forEach((memory: Memory, i: number) => {
      console.log(`${i + 1}. [${memory.type}] ${memory.content}`);
      console.log(`   Source: ${memory.source}`);
      console.log(`   Created: ${memory.createdAt}`);
      if (memory.tags && memory.tags.length > 0) {
        console.log(`   Tags: ${memory.tags.join(', ')}`);
      }
      console.log('');
    });
  });

// List memories
program
  .command('list')
  .description('List recent memories')
  .option('-t, --type <type>', 'Filter by type')
  .option('-l, --limit <number>', 'Max results', '20')
  .action(async (options) => {
    const memories = await store.list({
      type: options.type,
      limit: parseInt(options.limit, 10),
    });

    if (memories.length === 0) {
      console.log('No memories stored yet.');
      return;
    }

    console.log(`\n${memories.length} memories:\n`);
    memories.forEach((memory: Memory, i: number) => {
      console.log(`${i + 1}. [${memory.type}] ${memory.content}`);
      console.log(`   Source: ${memory.source}`);
      console.log('');
    });
  });

// Show statistics
program
  .command('stats')
  .description('Show memory statistics')
  .action(async () => {
    const stats = await store.stats();
    console.log('\n📊 Cortex Memory Statistics\n');
    console.log(`Total memories: ${stats.total}`);
    console.log('\nBy type:');

    if (Object.keys(stats.byType).length === 0) {
      console.log('  (none yet)');
    } else {
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    console.log('');
  });

// Get memory details
program
  .command('get <id>')
  .description('Get details of a specific memory')
  .action(async (id) => {
    try {
      const memory = await store.get(parseInt(id, 10));
      if (!memory) {
        console.log(`Memory ${id} not found`);
        process.exit(1);
      }

      console.log(`\n📝 Memory #${memory.id}\n`);
      console.log(`Type: ${memory.type}`);
      console.log(`Content: ${memory.content}`);
      console.log(`Source: ${memory.source}`);
      if (memory.tags && memory.tags.length > 0) {
        console.log(`Tags: ${memory.tags.join(', ')}`);
      }
      if (memory.metadata) {
        console.log(`Metadata: ${JSON.stringify(memory.metadata, null, 2)}`);
      }
      console.log(`Created: ${memory.createdAt}`);
      console.log(`Updated: ${memory.updatedAt}`);
      console.log('');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Edit memory
program
  .command('edit <id>')
  .description('Edit an existing memory')
  .option('-c, --content <text>', 'New memory content')
  .option('-t, --type <type>', 'New memory type (fact|decision|code|config|note)')
  .option('-s, --source <source>', 'New source')
  .option('--tags <tags>', 'New comma-separated tags (replaces existing)')
  .option('--add-tags <tags>', 'Add tags (comma-separated, keeps existing)')
  .option('--remove-tags <tags>', 'Remove tags (comma-separated)')
  .action(async (id, options) => {
    try {
      const memoryId = parseInt(id, 10);

      // Check if memory exists
      const existing = await store.get(memoryId);
      if (!existing) {
        console.log(`Memory ${id} not found`);
        process.exit(1);
      }

      // Build updates object
      const updates: Partial<Memory> = {};

      if (options.content) {
        updates.content = options.content;
      }

      if (options.type) {
        updates.type = options.type;
      }

      if (options.source) {
        updates.source = options.source;
      }

      // Handle tags
      if (options.tags) {
        updates.tags = options.tags.split(',').map((t: string) => t.trim());
      } else if (options.addTags || options.removeTags) {
        const currentTags = existing.tags || [];
        let newTags = [...currentTags];

        if (options.addTags) {
          const tagsToAdd = options.addTags.split(',').map((t: string) => t.trim());
          newTags = [...new Set([...newTags, ...tagsToAdd])];
        }

        if (options.removeTags) {
          const tagsToRemove = options.removeTags.split(',').map((t: string) => t.trim());
          newTags = newTags.filter((tag) => !tagsToRemove.includes(tag));
        }

        updates.tags = newTags;
      }

      // Check if any updates were provided
      if (Object.keys(updates).length === 0) {
        console.log('No updates provided. Use --help to see available options.');
        process.exit(1);
      }

      // Perform update
      const success = await store.update(memoryId, updates);

      if (success) {
        console.log(`✓ Memory ${id} updated`);

        // Show updated memory
        const updated = await store.get(memoryId);
        if (updated) {
          console.log(`\n📝 Updated Memory:\n`);
          console.log(`[${updated.type}] ${updated.content}`);
          console.log(`Source: ${updated.source}`);
          if (updated.tags && updated.tags.length > 0) {
            console.log(`Tags: ${updated.tags.join(', ')}`);
          }
        }
      } else {
        console.log(`Failed to update memory ${id}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Delete memory
program
  .command('delete <id>')
  .description('Delete a memory by ID')
  .action(async (id) => {
    const deleted = await store.delete(parseInt(id, 10));
    if (deleted) {
      console.log(`✓ Memory ${id} deleted`);
    } else {
      console.log(`Memory ${id} not found`);
      process.exit(1);
    }
  });

// Clear all memories
program
  .command('clear')
  .description('Delete all memories (use with caution!)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log('This will delete ALL memories. Use --force to confirm.');
      process.exit(1);
    }

    const count = await store.clear();
    console.log(`✓ Cleared ${count} memories`);
  });

// Info command
program
  .command('info')
  .description('Show Cortex configuration and paths')
  .action(() => {
    const dbPath = join(homedir(), '.cortex', 'memories.db');
    console.log('\n🧠 Cortex Information\n');
    console.log(`Database: ${dbPath}`);
    console.log(`Version: 0.8.2`);
    console.log('\nTo use with Claude Desktop:');
    console.log('Add this to your claude_desktop_config.json:\n');
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            cortex: {
              command: 'bunx',
              args: ['@ecuabyte/cortex-mcp-server'],
            },
          },
        },
        null,
        2
      )
    );
    console.log('');
  });

// Scan project command
program
  .command('scan [path]')
  .description('Scan a project to auto-extract context (TODOs, configs, docs)')
  .option('--no-save', 'Only show results, do not save to Cortex')
  .option('--no-todos', 'Skip TODO/FIXME extraction')
  .option('--no-docs', 'Skip documentation scanning')
  .option('--no-configs', 'Skip config file scanning')
  .action(async (scanPath: string | undefined, options) => {
    const { ProjectScanner } = await import('@ecuabyte/cortex-core');
    const path = scanPath || process.cwd();

    console.log(`\n📂 Scanning: ${path}\n`);

    const scanner = new ProjectScanner();
    const result = await scanner.scan({
      path,
      scanTodos: options.todos !== false,
      scanDocs: options.docs !== false,
      scanConfigs: options.configs !== false,
    });

    // Display results
    console.log(`Files scanned: ${result.summary.filesScanned}`);
    console.log(`Candidate project records found: ${result.summary.memoriesFound}`);
    console.log('');

    const byType = Object.entries(result.summary.byType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    if (byType) {
      console.log(`By type: ${byType}`);
    }

    if (result.summary.sources.length > 0) {
      console.log(
        `Sources: ${result.summary.sources.slice(0, 5).join(', ')}${result.summary.sources.length > 5 ? '...' : ''}`
      );
    }
    console.log('');

    // Show preview
    if (result.memories.length > 0) {
      console.log('Preview (first 10):');
      result.memories.slice(0, 10).forEach((m, i) => {
        console.log(
          `  ${i + 1}. [${m.type}] ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}`
        );
      });
      console.log('');
    }

    // Save if requested
    if (options.save !== false && result.memories.length > 0) {
      let saved = 0;
      for (const memory of result.memories) {
        try {
          await store.add(memory);
          saved++;
        } catch {
          // Skip duplicates
        }
      }
      console.log(`✓ Saved ${saved} project records to Cortex\n`);
    } else if (options.save === false) {
      console.log('(Use without --no-save to store memories)\n');
    }
  });

// Install command - auto-configure for all editors
program
  .command('install')
  .description('Auto-configure Cortex for AI editors and agent lifecycle capture')
  .option('-g, --global', 'Install globally for all projects (default)', true)
  .option('-p, --project [path]', 'Install for current project only')
  .option(
    '-e, --editor <editor>',
    'Install for specific editor only (cursor|windsurf|claude|vscode|zed)'
  )
  .option('--agents', 'Also create AGENTS.md file in project')
  .option('--hooks', 'Also configure Claude Code hooks for auto-memory')
  .option('--list', 'List detected editors and their config paths')
  .action(async (options) => {
    const installer = await import('./installer.js');

    // List mode
    if (options.list) {
      console.log('\n🔍 Detected AI Editors:\n');
      const editors = installer.detectInstalledEditors();
      editors.forEach((editor) => {
        const status = editor.installed ? '✅' : '❌';
        console.log(`${status} ${editor.displayName}`);
        console.log(`   Global: ${editor.globalPath}`);
        if (editor.projectPath) {
          console.log(`   Project: ${editor.projectPath}`);
        }
        console.log('');
      });
      return;
    }

    const projectPath =
      typeof options.project === 'string'
        ? options.project
        : options.project
          ? process.cwd()
          : undefined;
    const isGlobal = !projectPath;

    console.log(
      `\n🧠 Installing Cortex ${isGlobal ? 'globally' : `for project: ${projectPath}`}\n`
    );

    // Install for specific editor or all
    if (options.editor) {
      const editors = installer.detectInstalledEditors();
      const editor = editors.find((e) => e.name === options.editor);
      if (!editor) {
        console.error(`❌ Unknown editor: ${options.editor}`);
        console.log('Available: cursor, windsurf, claude, claude-desktop, vscode, zed');
        process.exit(1);
      }
      const result = installer.installForEditor(editor, { global: isGlobal, projectPath });
      console.log(result.message);
      console.log(`   Path: ${result.path}\n`);
    } else {
      // Install for all detected editors
      const { results, summary } = installer.installAll({ global: isGlobal, projectPath });

      results.forEach((r) => {
        console.log(r.message);
        if (r.success) {
          console.log(`   Path: ${r.path}`);
        }
        console.log('');
      });

      console.log(`\n📊 Summary: ${summary.success}/${summary.total} configured successfully\n`);
    }

    // Create AGENTS.md
    if (options.agents || projectPath) {
      const agentsPath = projectPath || process.cwd();
      const result = installer.installAgentsFile(agentsPath);
      console.log(result.message);
      if (result.success) {
        console.log(`   Path: ${result.path}`);
      }
      console.log('');
    }

    // Configure Claude hooks
    if (options.hooks) {
      const result = installer.installClaudeHooks({ global: isGlobal, projectPath });
      console.log(result.message);
      if (result.success) {
        console.log(`   Path: ${result.path}`);
      }
      console.log('');

      if (!projectPath) {
        const codexResult = installer.installCodexHooks({ global: true });
        console.log(codexResult.message);
        if (codexResult.success) console.log(`   Path: ${codexResult.path}`);
        console.log('');
      }
    }

    console.log('🎉 Done! Cortex is now integrated with your AI editors.\n');
    console.log('💡 Tips:');
    console.log('   • Restart your editors to load the new configuration');
    console.log('   • Run `cortex scan` to analyze your project');
    console.log('   • AI assistants can now use Cortex context and continuity tools\n');
  });

// Setup command - quick project initialization
program
  .command('setup')
  .description('Quick setup: install + scan current project')
  .option('--no-scan', 'Skip project scanning')
  .action(async (options) => {
    const installer = await import('./installer.js');
    const projectPath = process.cwd();

    console.log('\n🧠 Cortex Quick Setup\n');

    // 1. Install for project
    console.log('📦 Step 1: Configuring editors...\n');
    const { results } = installer.installAll({ projectPath });
    results.forEach((r) => {
      if (r.success) console.log(`   ${r.message}`);
    });

    // 2. Create AGENTS.md
    console.log('\n📝 Step 2: Creating AGENTS.md...');
    const agentsResult = installer.installAgentsFile(projectPath);
    console.log(`   ${agentsResult.message}`);

    // 3. Scan project
    if (options.scan !== false) {
      console.log('\n🔍 Step 3: Scanning project...\n');
      const { ProjectScanner } = await import('@ecuabyte/cortex-core');
      const scanner = new ProjectScanner();
      const result = await scanner.scan({ path: projectPath });

      console.log(`   Files scanned: ${result.summary.filesScanned}`);
      console.log(`   Candidate project records found: ${result.summary.memoriesFound}`);

      // Save memories
      if (result.memories.length > 0) {
        let saved = 0;
        for (const memory of result.memories) {
          try {
            await store.add(memory);
            saved++;
          } catch {
            // Skip duplicates
          }
        }
        console.log(`   ✓ Saved ${saved} project records to Cortex\n`);
      }
    }

    console.log('\n🎉 Setup complete!\n');
    console.log('Your AI assistants can now access project context via Cortex.\n');
    console.log('Try asking your AI: "What project state and handoffs are available?"\n');
  });

// Engineering continuity commands. These emit JSON so any agent can consume
// the same state without depending on a provider-specific session format.
program
  .command('start <objective>')
  .description('Start a durable task and agent attempt for the current repository')
  .option(
    '--acceptance <criterion>',
    'Acceptance criterion (repeatable)',
    (value, previous: string[]) => [...previous, value],
    []
  )
  .option('--agent <harness>', 'Agent or harness name', 'cortex-cli')
  .option('--model <model>', 'Model name')
  .option('--version <version>', 'Agent or harness version')
  .option('--session <sessionId>', 'Provider session identifier')
  .option('--task-id <taskId>', 'Reuse an explicit task identifier')
  .option('--attempt-id <attemptId>', 'Reuse an explicit attempt identifier')
  .action(async (objective, options) => {
    const repository = getRepositoryContext();
    const result = await continuityStore.startTask({
      projectId: deriveProjectId(repository),
      objective,
      acceptanceCriteria: options.acceptance,
      repository,
      actor: {
        harness: options.agent,
        ...(options.model ? { model: options.model } : {}),
        ...(options.version ? { version: options.version } : {}),
        ...(options.session ? { sessionId: options.session } : {}),
      },
      ...(options.taskId ? { taskId: options.taskId } : {}),
      ...(options.attemptId ? { attemptId: options.attemptId } : {}),
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('status [taskId]')
  .description('Show the current task, attempt, handoff, and evidence')
  .action(async (taskId) => {
    const result = await continuityStore.resume({ taskId });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('resume [taskId]')
  .description('Resume the latest task or an explicit task')
  .action(async (taskId) => {
    const result = await continuityStore.resume({ taskId });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('capture')
  .description('Record evidence from the current agent attempt')
  .requiredOption('--task <taskId>', 'Task identifier')
  .requiredOption('--attempt <attemptId>', 'Attempt identifier')
  .requiredOption('--kind <kind>', 'Evidence kind')
  .requiredOption('--summary <summary>', 'Short evidence summary')
  .requiredOption('--source <source>', 'Evidence source')
  .option('--authority <authority>', 'Evidence authority', 'observed')
  .option('--status <status>', 'Evidence status', 'current')
  .option('--details <json>', 'Evidence details as JSON')
  .action(async (options) => {
    const details = options.details
      ? (JSON.parse(options.details) as Record<string, unknown>)
      : undefined;
    const result = await continuityStore.capture({
      taskId: options.task,
      attemptId: options.attempt,
      kind: options.kind,
      summary: options.summary,
      source: options.source,
      authority: options.authority,
      status: options.status,
      ...(details ? { details } : {}),
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('handoff')
  .description('Create a portable handoff before switching agents')
  .requiredOption('--task <taskId>', 'Task identifier')
  .requiredOption('--attempt <attemptId>', 'Attempt identifier')
  .option('--summary <summary>', 'Handoff summary')
  .option(
    '--next <action>',
    'Next action (repeatable)',
    (value, previous: string[]) => [...previous, value],
    []
  )
  .action(async (options) => {
    const result = await continuityStore.createHandoff({
      taskId: options.task,
      attemptId: options.attempt,
      ...(options.summary ? { summary: options.summary } : {}),
      nextActions: options.next,
    });
    console.log(
      JSON.stringify(
        { handoff: result, markdown: renderContinuityHandoffMarkdown(result) },
        null,
        2
      )
    );
  });

program
  .command('verify')
  .description('Record a verification backed by a tool, test, Git, CI, or human')
  .requiredOption('--task <taskId>', 'Task identifier')
  .requiredOption('--attempt <attemptId>', 'Attempt identifier')
  .requiredOption('--summary <summary>', 'What was verified')
  .requiredOption('--source <source>', 'Verification source')
  .option('--status <status>', 'Verification status', 'current')
  .option('--details <json>', 'Verification details as JSON')
  .action(async (options) => {
    const details = options.details
      ? (JSON.parse(options.details) as Record<string, unknown>)
      : undefined;
    const result = await continuityStore.verify({
      taskId: options.task,
      attemptId: options.attempt,
      summary: options.summary,
      source: options.source,
      status: options.status,
      ...(details ? { details } : {}),
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('detect <taskId>')
  .description('Detect branch, commit, or remote drift before continuing')
  .action(async (taskId) => {
    const result = await continuityStore.detect({
      taskId,
      repository: getRepositoryContext(),
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('bridge')
  .description('Receive normalized or provider-native agent lifecycle events')
  .command('ingest')
  .description('Ingest one JSON event from stdin')
  .requiredOption('--provider <provider>', 'Agent provider (codex|opencode|claude|cursor|gemini)')
  .action(async (options) => {
    try {
      const provider = options.provider as AgentProvider;
      if (!['codex', 'opencode', 'claude', 'cursor', 'gemini'].includes(provider)) {
        throw new Error(`Unsupported agent provider: ${provider}`);
      }

      const payload = await readJsonStdin();
      const cwd =
        (typeof payload['cwd'] === 'string' && payload['cwd']) ||
        (typeof payload['directory'] === 'string' && payload['directory']) ||
        process.cwd();
      const event = normalizeAgentPayload(provider, payload, getRepositoryContext(cwd));
      const result = await new AgentBridge(continuityStore).ingest(event);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(
        `Bridge ingestion failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exitCode = 1;
    }
  });

async function readJsonStdin(): Promise<Record<string, unknown>> {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  return parseBridgeInput(input);
}

program.parse();
