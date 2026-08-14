import {
  ContextGuard,
  ContextRouter,
  ContinuityStore,
  createEmbeddingProvider,
  type Memory,
  MemoryStore,
  ProjectScanner,
  renderContinuityHandoffMarkdown,
} from '@ecuabyte/cortex-core';
import {
  MEMORY_TYPES,
  SENSITIVE_DATA_FILTERS,
  SERVER_CONFIG,
  TOOL_NAMES,
  WORKFLOW_PHASES,
} from '@ecuabyte/cortex-shared';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createContinuityToolDefinitions } from './continuity-tools';

// Helper to format success response using the generic ToolResponse pattern
function formatOutput(text: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const store = new MemoryStore();
const continuityStore = new ContinuityStore();
const router = new ContextRouter(store);
const guard = new ContextGuard();

// CLI Argument Handling
import { parseArgs } from 'node:util';

// Handle --auto-save flag (Standalone Mode)
if (process.argv.includes('--auto-save')) {
  (async () => {
    try {
      // Read JSON from stdin
      const input = await new Promise<string>((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
          data += chunk;
        });
        process.stdin.on('end', () => resolve(data));
      });

      if (!input.trim()) {
        console.error('No input provided to --auto-save');
        process.exit(0);
      }

      const payload = JSON.parse(input);
      // Expected structure matches cortex_auto_save tool input:
      // { conversation_summary: string, memories: [] }

      const memories = payload.memories || [];
      if (Array.isArray(memories) && memories.length > 0) {
        console.error(`[Cortex] Auto-saving ${memories.length} memories...`);
        let count = 0;
        for (const m of memories) {
          try {
            await store.add({
              content: m.content,
              type: m.type || 'note',
              source: 'auto-save',
              tags: m.tags || ['auto-saved'],
            });
            count++;
          } catch (err) {
            console.error('[Cortex] Failed to save memory:', err);
          }
        }
        console.log(`Saved ${count} memories.`);
      } else {
        console.log('No memories to save.');
      }
      process.exit(0);
    } catch (error) {
      console.error('[Cortex] Auto-save error:', error);
      process.exit(1);
    }
  })();
}

try {
  const args = process.argv.slice(2);
  if (args[0] === 'generate-config') {
    const { values } = parseArgs({
      args: args,
      options: {
        target: {
          type: 'string',
        },
        local: {
          type: 'boolean',
        },
      },
      strict: false,
    });

    const target = values.target as string | undefined;
    const isLocal = values.local as boolean | undefined;
    const targets = [
      'claude',
      'claude-desktop',
      'cursor',
      'windsurf',
      'vscode',
      'zed',
      'goose',
      'gemini',
      'antigravity',
    ];

    if (!target || !targets.includes(target)) {
      console.error(`Usage: cortex-mcp generate-config --target <${targets.join('|')}> [--local]`);
      process.exit(1);
    }

    let command = 'bunx';
    let cmdArgs = ['@ecuabyte/cortex-mcp-server'];

    if (isLocal) {
      // Use current absolute path involved in running this script
      // We assume we are running from the built dist file or via bun run
      // Best bet for local dev is to point to the current file's location if possible,
      // or assume standard repo structure if running from source.

      const fs = await import('node:fs');
      const path = await import('node:path');

      // Resolve absolute path to dist/mcp-server.js
      // If we are running from src (via bun), we need to point to dist
      const projectRoot = path.resolve(__dirname, '..');
      const distPath = path.join(projectRoot, 'dist', 'mcp-server.js');

      if (fs.existsSync(distPath)) {
        command = 'bun';
        cmdArgs = ['run', distPath];
      } else {
        console.error(
          'Warning: Could not find local dist/mcp-server.js. Make sure to build first.'
        );
        // Fallback to bunx but warn
      }
    }

    let config: Record<string, unknown> = {};

    switch (target) {
      case 'claude':
      case 'claude-desktop':
      case 'cursor':
      case 'windsurf':
      case 'vscode':
        config = {
          mcpServers: {
            cortex: {
              command,
              args: cmdArgs,
            },
          },
        };
        break;
      case 'zed':
        config = {
          context_servers: {
            'cortex-memory': {
              command: {
                path: command,
                args: cmdArgs,
              },
              settings: {},
            },
          },
        };
        break;
      case 'gemini':
      case 'antigravity':
        config = {
          $schema:
            'https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json',
          mcpServers: {
            cortex: {
              command,
              args: cmdArgs,
              trust: true,
              description: 'Cortex engineering state and verified handoffs for coding agents',
            },
          },
        };
        break;
      case 'goose':
        console.log(`Run this command to configure Goose:`);
        console.log(`goose configure mcp add cortex "${command} ${cmdArgs.join(' ')}"`);
        process.exit(0);
    }

    console.log(JSON.stringify(config, null, 2));
    process.exit(0);
  }
} catch (e) {
  // If parsing fails or other issues, just ignore and proceed to server start
  // or print error if it was clearly a CLI attempt
  if (process.argv[2] === 'generate-config') {
    console.error('Error generating config:', e);
    process.exit(1);
  }
}

// Initialize embedding provider if available (Ollama or OpenAI)
let embeddingInitialized = false;
(async () => {
  try {
    const provider = await createEmbeddingProvider({
      openaiApiKey: process.env['OPENAI_API_KEY'],
    });
    if (provider) {
      store.setEmbeddingProvider(provider);
      router.setEmbeddingProvider(provider);
      embeddingInitialized = true;
      console.error(`[Cortex] Embedding provider initialized: ${provider.model}`);
    }
  } catch (e) {
    console.error('[Cortex] Failed to initialize embedding provider:', e);
  }
})();

const server = new Server(
  {
    name: SERVER_CONFIG.NAME,
    version: SERVER_CONFIG.VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
    instructions:
      'Cortex preserves verified engineering continuity. Start or resume a task with cortex_start or cortex_resume, capture high-signal evidence with cortex_capture, create a handoff before switching agents, and verify claims with cortex_verify. MCP sessions are not task state: always use explicit taskId and attemptId. Treat agent summaries as unverified until supported by Git, tests, CI, tools, files, or human approval.',
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: TOOL_NAMES.SEARCH,
        description: 'Search through project memories (facts, decisions, code patterns, configs)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find relevant memories',
            },
            type: {
              type: 'string',
              enum: Object.values(MEMORY_TYPES),
              description: 'Filter by memory type (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
            semantic: {
              type: 'boolean',
              description:
                'Use semantic (AI) search instead of keyword search. Requires Ollama or OpenAI.',
              default: false,
            },
          },
          required: ['query'],
        },
      },
      {
        name: TOOL_NAMES.ADD,
        description: 'Add a new memory to the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content/description of the memory',
            },
            type: {
              type: 'string',
              enum: Object.values(MEMORY_TYPES),
              description: 'Type of memory',
            },
            source: {
              type: 'string',
              description: 'Source of the memory (e.g., file path, URL, conversation)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for categorization',
            },
          },
          required: ['content', 'type', 'source'],
        },
      },
      {
        name: TOOL_NAMES.LIST,
        description: 'List recent memories, optionally filtered by type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: Object.values(MEMORY_TYPES),
              description: 'Filter by memory type (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
              default: 20,
            },
          },
        },
      },
      {
        name: TOOL_NAMES.STATS,
        description: 'Get statistics about stored memories',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: TOOL_NAMES.CONTEXT,
        description:
          'Get intelligent, task-relevant context. Uses AI-powered routing to find the most useful memories for your current task.',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Description of what you are currently working on',
            },
            currentFile: {
              type: 'string',
              description: 'Current file path for additional context relevance (optional)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific tags (optional)',
            },
            type: {
              type: 'string',
              enum: Object.values(MEMORY_TYPES),
              description: 'Filter by memory type (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of context items (default: 5)',
              default: 5,
            },
          },
          required: ['task'],
        },
      },
      {
        name: TOOL_NAMES.GUARD,
        description:
          'Check content for sensitive data (API keys, secrets, PII) before sharing. Returns filtered content or warnings.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to check/filter for sensitive data',
            },
            filters: {
              type: 'array',
              items: {
                type: 'string',
                enum: SENSITIVE_DATA_FILTERS,
              },
              description: 'Types of sensitive data to filter (default: all)',
            },
            mode: {
              type: 'string',
              enum: ['redact', 'block', 'warn'],
              description:
                'How to handle sensitive data: redact (replace with [REDACTED]), block (return empty if found), warn (flag but keep)',
              default: 'redact',
            },
          },
          required: ['content'],
        },
      },
      {
        name: TOOL_NAMES.SCAN,
        description:
          'Scan a project directory to extract and store context automatically. Finds TODOs, README info, configs, architecture decisions. Returns extracted data for AI analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Project directory path to scan (defaults to current working directory)',
            },
            save: {
              type: 'boolean',
              description: 'Whether to save extracted memories to Cortex (default: true)',
              default: true,
            },
          },
        },
      },
      {
        name: TOOL_NAMES.AUTO_SAVE,
        description:
          'ALWAYS call this at the end of conversations where important decisions, patterns, or facts were discussed. Automatically analyzes and saves relevant memories. Use this to build persistent context across sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_summary: {
              type: 'string',
              description: 'Brief summary of what was discussed in this conversation',
            },
            memories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  content: {
                    type: 'string',
                    description: 'The memory content to save',
                  },
                  type: {
                    type: 'string',
                    enum: Object.values(MEMORY_TYPES),
                    description: 'Type of memory',
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags for categorization',
                  },
                },
                required: ['content', 'type'],
              },
              description:
                'Array of memories to save from this conversation. Include all important decisions, patterns, and facts discussed.',
            },
          },
          required: ['conversation_summary', 'memories'],
        },
      },
      {
        name: TOOL_NAMES.REMEMBER,
        description:
          'Quick way to save a single important piece of information. Use when the user says something like "remember this" or when you encounter an important decision.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'What to remember',
            },
            type: {
              type: 'string',
              enum: Object.values(MEMORY_TYPES),
              description: 'Type of memory (default: note)',
              default: 'note',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags',
            },
          },
          required: ['content'],
        },
      },
      {
        name: TOOL_NAMES.RECALL,
        description:
          'Quickly recall relevant context for the current task. Call this at the START of conversations to load context from previous sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'What to recall - describe your current task or topic',
            },
            limit: {
              type: 'number',
              description: 'Maximum memories to recall (default: 5)',
              default: 5,
            },
          },
          required: ['query'],
        },
      },
      {
        name: TOOL_NAMES.WORKFLOW,
        description:
          'Manage the development workflow state (EXPLORE → PLAN → CODE → VERIFY → COMMIT). Use this to track progress and ensure all steps are followed.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['start', 'next', 'jump', 'status'],
              description: 'Action to perform on the workflow',
            },
            phase: {
              type: 'string',
              enum: Object.values(WORKFLOW_PHASES),
              description: 'Phase to jump to (only for "jump" action)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: TOOL_NAMES.CONSTITUTION,
        description:
          'Retrieve the Constitutional Principles that guide agent behavior. Consult this when you are unsure about the ethical or architectural correctness of an action.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Specific principle to query (optional)',
            },
          },
        },
      },
      {
        name: TOOL_NAMES.THINK,
        description:
          'Log a deep reasoning process into persistent memory. Use this for "think hard" or "ultrathink" moments to document your decision path for future reference.',
        inputSchema: {
          type: 'object',
          properties: {
            thought: {
              type: 'string',
              description: 'The detailed reasoning content',
            },
            mode: {
              type: 'string',
              enum: ['think', 'think_hard', 'ultrathink'],
              description: 'The depth of thinking',
            },
          },
          required: ['thought'],
        },
      },
      ...createContinuityToolDefinitions(),
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = request.params.arguments as Record<string, unknown> | undefined;

  try {
    switch (name) {
      case TOOL_NAMES.SEARCH: {
        if (!args) throw new Error('Missing arguments');
        const query = args['query'] as string;
        const type = args['type'] as string | undefined;
        const limit = (args['limit'] as number) || 10;
        const semantic = (args['semantic'] as boolean) || false;

        let results: Memory[];
        let searchMode = 'keyword';

        if (semantic && embeddingInitialized) {
          // Use semantic search
          const semanticResults = await store.searchSemantic(query, {
            type: type as Memory['type'],
            limit,
            minScore: 0.3,
          });
          results = semanticResults.map((r) => r.memory);
          searchMode = 'semantic';
        } else {
          // Use keyword search
          results = await store.search(query, { type, limit });
        }

        return {
          content: [
            {
              type: 'text',
              text:
                results.length > 0
                  ? `Found ${results.length} memories (${searchMode} search):\n\n` +
                    results
                      .map(
                        (m: Memory, i: number) =>
                          `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}\n   Created: ${m.createdAt}`
                      )
                      .join('\n\n')
                  : `No memories found matching your query (${searchMode} search).`,
            },
          ],
        };
      }

      case TOOL_NAMES.ADD: {
        if (!args) throw new Error('Missing arguments');
        const content = args['content'] as string;
        const type = args['type'] as Memory['type'];
        const source = args['source'] as string;
        const tags = args['tags'] as string[] | undefined;

        const id = await store.add({ content, type, source, tags });

        return formatOutput(`✓ Memory added successfully (ID: ${id})`);
      }

      case TOOL_NAMES.LIST: {
        const type = args?.['type'] as string | undefined;
        const limit = (args?.['limit'] as number) || 20;

        const memories = await store.list({ type, limit });

        return formatOutput(
          memories.length > 0
            ? `${memories.length} memories:\n\n` +
                memories
                  .map(
                    (m: Memory, i: number) =>
                      `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}`
                  )
                  .join('\n\n')
            : 'No memories stored yet.'
        );
      }

      case TOOL_NAMES.STATS: {
        const stats = await store.stats();
        const typeBreakdown = Object.entries(stats.byType)
          .map(([type, count]) => `  ${type}: ${count}`)
          .join('\n');

        return formatOutput(
          `📊 Cortex Memory Statistics\n\nTotal memories: ${stats.total}\n\nBy type:\n${
            typeBreakdown || '  (none yet)'
          }`
        );
      }

      case TOOL_NAMES.CONTEXT: {
        if (!args) throw new Error('Missing arguments');
        const task = args['task'] as string;
        const currentFile = args['currentFile'] as string | undefined;
        const tags = args['tags'] as string[] | undefined;
        const type = args['type'] as Memory['type'] | undefined;
        const limit = (args['limit'] as number) || 5;

        const results = await router.routeWithScores({ task, currentFile, tags, type, limit });

        if (results.length === 0) {
          return formatOutput(
            'No relevant context found for your task. Try adding some memories first with cortex_add.'
          );
        }

        const contextText = results
          .map(
            (r, i) =>
              `${i + 1}. [${r.memory.type}] ${r.memory.content}\n   Relevance: ${Math.round(r.score * 100)}% | ${r.reason}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `🧠 Found ${results.length} relevant context items for "${task}":\n\n${contextText}`,
            },
          ],
        };
      }

      case TOOL_NAMES.GUARD: {
        if (!args) throw new Error('Missing arguments');
        const content = args['content'] as string;

        type FilterType = (typeof SENSITIVE_DATA_FILTERS)[number];
        const filters = (args['filters'] as FilterType[]) || [...SENSITIVE_DATA_FILTERS];
        const mode = (args['mode'] as 'redact' | 'block' | 'warn') || 'redact';

        const result = guard.guard(content, { filters, mode });

        if (!result.wasFiltered) {
          return formatOutput(`✅ No sensitive data detected. Content is safe to share.`);
        }

        const detailsText = result.filterDetails
          ?.map((d) => `  - ${d.type}: ${d.count} found`)
          .join('\n');

        if (mode === 'block') {
          return {
            content: [
              {
                type: 'text',
                text: `⛔ Sensitive data detected! Content blocked.\n\nDetected:\n${detailsText}`,
              },
            ],
          };
        }

        if (mode === 'warn') {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ Sensitive data detected but preserved:\n\nDetected:\n${detailsText}\n\nOriginal content:\n${result.content}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `🔒 Sensitive data redacted:\n\nFiltered:\n${detailsText}\n\nSafe content:\n${result.content}`,
            },
          ],
        };
      }

      case TOOL_NAMES.SCAN: {
        const scanPath = (args?.['path'] as string) || process.cwd();
        const shouldSave = args?.['save'] !== false;

        const scanner = new ProjectScanner();
        const result = await scanner.scan({ path: scanPath });

        // Save extracted memories if requested
        if (shouldSave && result.memories.length > 0) {
          let savedCount = 0;
          for (const memory of result.memories) {
            try {
              await store.add(memory);
              savedCount++;
            } catch {
              // Skip duplicates or errors
            }
          }
          result.summary.memoriesFound = savedCount;
        }

        // Format for LLM analysis
        const byTypeStr = Object.entries(result.summary.byType)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ');

        const memorySummary = result.memories
          .slice(0, 20)
          .map(
            (m, i) =>
              `${i + 1}. [${m.type}] ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text:
                `📊 Project Scan Complete\n\n` +
                `Path: ${scanPath}\n` +
                `Files scanned: ${result.summary.filesScanned}\n` +
                `Memories ${shouldSave ? 'saved' : 'found'}: ${result.summary.memoriesFound}\n` +
                `By type: ${byTypeStr}\n` +
                `Sources: ${result.summary.sources.slice(0, 5).join(', ')}${result.summary.sources.length > 5 ? '...' : ''}\n\n` +
                `Extracted context:\n${memorySummary}\n\n` +
                `💡 You can now use these memories for context. Ask me to analyze patterns or summarize the project architecture.`,
            },
          ],
        };
      }

      case TOOL_NAMES.AUTO_SAVE: {
        if (!args) throw new Error('Missing arguments');
        const summary = args['conversation_summary'] as string;
        const memories = args['memories'] as Array<{
          content: string;
          type: string;
          tags?: string[];
        }>;

        if (!memories || memories.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📝 No memories to save from this conversation.',
              },
            ],
          };
        }

        let savedCount = 0;
        const errors: string[] = [];

        for (const memory of memories) {
          try {
            await store.add({
              content: memory.content,
              type: memory.type as Memory['type'],
              source: 'auto-save',
              tags: memory.tags || ['auto-saved'],
            });
            savedCount++;
          } catch (_e) {
            errors.push(memory.content.slice(0, 50));
          }
        }

        return {
          content: [
            {
              type: 'text',
              text:
                `🧠 Auto-Save Complete\n\n` +
                `Conversation: ${summary.slice(0, 100)}${summary.length > 100 ? '...' : ''}\n` +
                `Memories saved: ${savedCount}/${memories.length}\n` +
                (errors.length > 0 ? `\n⚠️ Skipped ${errors.length} duplicates` : '') +
                `\n\n✅ Context will be available in future sessions.`,
            },
          ],
        };
      }

      case TOOL_NAMES.REMEMBER: {
        if (!args) throw new Error('Missing arguments');
        const content = args['content'] as string;
        const type = (args['type'] as Memory['type']) || 'note';
        const tags = args['tags'] as string[] | undefined;

        const id = await store.add({
          content,
          type,
          source: 'quick-remember',
          tags: tags || ['remembered'],
        });

        return {
          content: [
            {
              type: 'text',
              text: `✓ Remembered: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}" (ID: ${id})`,
            },
          ],
        };
      }

      case TOOL_NAMES.RECALL: {
        if (!args) throw new Error('Missing arguments');
        const query = args['query'] as string;
        const limit = (args['limit'] as number) || 5;

        // Use router for intelligent context retrieval
        const results = await router.routeWithScores({ task: query, limit });

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 No relevant memories found for "${query}". This might be a new topic.`,
              },
            ],
          };
        }

        const contextText = results
          .map(
            (r, i) =>
              `${i + 1}. [${r.memory.type}] ${r.memory.content}\n   Relevance: ${Math.round(r.score * 100)}%`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text:
                `🧠 Recalled ${results.length} memories for "${query}":\n\n${contextText}\n\n` +
                `💡 Use this context to inform your responses.`,
            },
          ],
        };
      }

      case TOOL_NAMES.WORKFLOW: {
        if (!args) throw new Error('Missing arguments');
        const action = args['action'] as 'start' | 'next' | 'jump' | 'status';
        const phase = args['phase'] as string | undefined;

        return {
          content: [
            {
              type: 'text',
              text: `🔄 Workflow Action: ${action.toUpperCase()}\n\nCurrent Phase: ${
                phase ? phase.toUpperCase() : 'Determined by User'
              }\n\nStandard Cycle:\n${Object.values(WORKFLOW_PHASES).join(
                ' → '
              )}\n\nInstructions:\n1. EXPLORE: Read files, query memory\n2. PLAN: Design approach\n3. CODE: Implement changes\n4. VERIFY: Run tests\n5. COMMIT: Save changes`,
            },
          ],
        };
      }

      case TOOL_NAMES.CONSTITUTION: {
        const query = args?.['query'] as string | undefined;

        const principles = [
          '1. Memory First - Always query cortex_context before decisions',
          '2. Document Why - Save reasoning, not just choices',
          '3. Verify Before Change - Check existing patterns first',
          '4. Incremental Progress - Small commits, frequent checkpoints',
          '5. Zero Secrets - Never log, commit, or transmit secrets/PII',
          '6. Single Responsibility - One clear purpose per task',
          '7. Plan Before Code - Outline approach, get approval, then implement',
        ];

        const filtered = query
          ? principles.filter((p) => p.toLowerCase().includes(query.toLowerCase()))
          : principles;

        return {
          content: [
            {
              type: 'text',
              text: `📜 Cortex Constitution\n\n${filtered.join('\n')}`,
            },
          ],
        };
      }

      case TOOL_NAMES.THINK: {
        if (!args) throw new Error('Missing arguments');
        const thought = args['thought'] as string;
        const mode = (args['mode'] as string) || 'think';

        const id = await store.add({
          content: thought,
          type: 'note',
          source: 'cortex_think',
          tags: ['thinking', mode],
        });

        return {
          content: [
            {
              type: 'text',
              text: `💭 Thought recorded (${mode}): "${thought.slice(0, 50)}..." (ID: ${id})`,
            },
          ],
        };
      }

      case TOOL_NAMES.START: {
        if (!args) throw new Error('Missing arguments');
        const started = await continuityStore.startTask({
          projectId: args['projectId'] as string,
          objective: args['objective'] as string,
          acceptanceCriteria: args['acceptanceCriteria'] as string[] | undefined,
          repository: args['repository'] as Parameters<
            ContinuityStore['startTask']
          >[0]['repository'],
          actor: args['actor'] as Parameters<ContinuityStore['startTask']>[0]['actor'],
          taskId: args['taskId'] as string | undefined,
          attemptId: args['attemptId'] as string | undefined,
        });
        return formatOutput(JSON.stringify(started, null, 2));
      }

      case TOOL_NAMES.STATUS: {
        const result = await continuityStore.resume({
          taskId: args?.['taskId'] as string | undefined,
        });
        return formatOutput(
          JSON.stringify(
            { task: result.task, attempt: result.attempt, handoff: result.handoff },
            null,
            2
          )
        );
      }

      case TOOL_NAMES.CAPTURE: {
        if (!args) throw new Error('Missing arguments');
        const evidence = await continuityStore.capture({
          taskId: args['taskId'] as string,
          attemptId: args['attemptId'] as string,
          kind: args['kind'] as Parameters<ContinuityStore['capture']>[0]['kind'],
          summary: args['summary'] as string,
          details: args['details'] as Record<string, unknown> | undefined,
          source: args['source'] as Parameters<ContinuityStore['capture']>[0]['source'],
          authority: args['authority'] as Parameters<ContinuityStore['capture']>[0]['authority'],
          status: args['status'] as Parameters<ContinuityStore['capture']>[0]['status'],
          observedAt: args['observedAt'] as string | undefined,
        });
        return formatOutput(JSON.stringify(evidence, null, 2));
      }

      case TOOL_NAMES.HANDOFF: {
        if (!args) throw new Error('Missing arguments');
        const handoff = await continuityStore.createHandoff({
          taskId: args['taskId'] as string,
          attemptId: args['attemptId'] as string,
          summary: args['summary'] as string | undefined,
          nextActions: args['nextActions'] as string[] | undefined,
        });
        return formatOutput(
          JSON.stringify({ handoff, markdown: renderContinuityHandoffMarkdown(handoff) }, null, 2)
        );
      }

      case TOOL_NAMES.RESUME: {
        const result = await continuityStore.resume({
          taskId: args?.['taskId'] as string | undefined,
        });
        return formatOutput(JSON.stringify(result, null, 2));
      }

      case TOOL_NAMES.VERIFY: {
        if (!args) throw new Error('Missing arguments');
        const verification = await continuityStore.verify({
          taskId: args['taskId'] as string,
          attemptId: args['attemptId'] as string,
          summary: args['summary'] as string,
          source: args['source'] as Parameters<ContinuityStore['verify']>[0]['source'],
          details: args['details'] as Record<string, unknown> | undefined,
          status: args['status'] as Parameters<ContinuityStore['verify']>[0]['status'],
        });
        return formatOutput(JSON.stringify(verification, null, 2));
      }

      case TOOL_NAMES.DETECT: {
        if (!args) throw new Error('Missing arguments');
        const detection = await continuityStore.detect({
          taskId: args['taskId'] as string,
          repository: args['repository'] as Parameters<ContinuityStore['detect']>[0]['repository'],
        });
        return formatOutput(JSON.stringify(detection, null, 2));
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const args = process.argv.slice(2);

  // Handle setup command (delegates to CLI)
  if (args.includes('--setup')) {
    console.log('🚀 Delegating to Cortex CLI for setup...');
    const { execSync } = await import('node:child_process');
    try {
      execSync('bunx @ecuabyte/cortex-cli setup', { stdio: 'inherit' });
      process.exit(0);
    } catch (e) {
      console.error('❌ Setup failed:', e);
      process.exit(1);
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cortex MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
