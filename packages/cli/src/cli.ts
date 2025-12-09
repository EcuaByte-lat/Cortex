#!/usr/bin/env node
import { Command } from 'commander';
import { MemoryStore } from '@cortex/core';
import { join } from 'path';
import { homedir } from 'os';

const program = new Command();
const store = new MemoryStore();

program
  .name('cortex')
  .description('Universal memory layer for AI coding tools')
  .version('0.1.0');

// Add memory
program
  .command('add')
  .description('Add a new memory')
  .requiredOption('-c, --content <text>', 'Memory content')
  .requiredOption('-t, --type <type>', 'Memory type (fact|decision|code|config|note)')
  .requiredOption('-s, --source <source>', 'Source (file, url, conversation, etc)')
  .option('--tags <tags>', 'Comma-separated tags')
  .action((options) => {
    try {
      const id = store.add({
        content: options.content,
        type: options.type,
        source: options.source,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined
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
  .action((query, options) => {
    const results = store.search(query, {
      type: options.type,
      limit: parseInt(options.limit)
    });

    if (results.length === 0) {
      console.log('No memories found.');
      return;
    }

    console.log(`\nFound ${results.length} memories:\n`);
    results.forEach((memory: any, i: number) => {
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
  .action((options) => {
    const memories = store.list({
      type: options.type,
      limit: parseInt(options.limit)
    });

    if (memories.length === 0) {
      console.log('No memories stored yet.');
      return;
    }

    console.log(`\n${memories.length} memories:\n`);
    memories.forEach((memory: any, i: number) => {
      console.log(`${i + 1}. [${memory.type}] ${memory.content}`);
      console.log(`   Source: ${memory.source}`);
      console.log('');
    });
  });

// Show statistics
program
  .command('stats')
  .description('Show memory statistics')
  .action(() => {
    const stats = store.stats();
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

// Delete memory
program
  .command('delete <id>')
  .description('Delete a memory by ID')
  .action((id) => {
    const deleted = store.delete(parseInt(id));
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
  .action((options) => {
    if (!options.force) {
      console.log('This will delete ALL memories. Use --force to confirm.');
      process.exit(1);
    }
    
    const count = store.clear();
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
    console.log(`Version: 0.1.0`);
    console.log('\nTo use with Claude Desktop:');
    console.log('Add this to your claude_desktop_config.json:\n');
    console.log(JSON.stringify({
      "mcpServers": {
        "cortex": {
          "command": "bun",
          "args": ["run", join(process.cwd(), "packages", "mcp-server", "dist", "mcp-server.js")]
        }
      }
    }, null, 2));
    console.log('');
  });

program.parse();
