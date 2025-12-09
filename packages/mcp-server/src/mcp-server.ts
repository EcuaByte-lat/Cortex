#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MemoryStore } from '@cortex/core';

const store = new MemoryStore();

const server = new Server(
  {
    name: 'cortex-memory',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'cortex_search',
        description: 'Search through project memories (facts, decisions, code patterns, configs)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find relevant memories'
            },
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Filter by memory type (optional)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'cortex_add',
        description: 'Add a new memory to the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content/description of the memory'
            },
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Type of memory'
            },
            source: {
              type: 'string',
              description: 'Source of the memory (e.g., file path, URL, conversation)'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for categorization'
            }
          },
          required: ['content', 'type', 'source']
        }
      },
      {
        name: 'cortex_list',
        description: 'List recent memories, optionally filtered by type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Filter by memory type (optional)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
              default: 20
            }
          }
        }
      },
      {
        name: 'cortex_stats',
        description: 'Get statistics about stored memories',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'cortex_search': {
        if (!args) throw new Error('Missing arguments');
        const results = store.search(args.query as string, {
          type: args.type as string | undefined,
          limit: (args.limit as number) || 10
        });
        
        return {
          content: [
            {
              type: 'text',
              text: results.length > 0
                ? `Found ${results.length} memories:\n\n` + 
                  results.map((m: any, i: number) => 
                    `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}\n   Created: ${m.createdAt}`
                  ).join('\n\n')
                : 'No memories found matching your query.'
            }
          ]
        };
      }

      case 'cortex_add': {
        if (!args) throw new Error('Missing arguments');
        const id = store.add({
          content: args.content as string,
          type: args.type as any,
          source: args.source as string,
          tags: args.tags as string[] | undefined
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `✓ Memory added successfully (ID: ${id})`
            }
          ]
        };
      }

      case 'cortex_list': {
        const memories = store.list({
          type: args?.type as string | undefined,
          limit: (args?.limit as number) || 20
        });
        
        return {
          content: [
            {
              type: 'text',
              text: memories.length > 0
                ? `${memories.length} memories:\n\n` + 
                  memories.map((m: any, i: number) => 
                    `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}`
                  ).join('\n\n')
                : 'No memories stored yet.'
            }
          ]
        };
      }

      case 'cortex_stats': {
        const stats = store.stats();
        const typeBreakdown = Object.entries(stats.byType)
          .map(([type, count]) => `  ${type}: ${count}`)
          .join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `📊 Cortex Memory Statistics\n\nTotal memories: ${stats.total}\n\nBy type:\n${typeBreakdown || '  (none yet)'}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cortex MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
