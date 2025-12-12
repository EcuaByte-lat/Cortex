# Quick Start

Get up and running with Cortex in 5 minutes!

## What is Cortex?

Cortex is a **persistent memory system for AI coding assistants**. It solves the problem of AI tools forgetting context between sessions by providing:

- 🧠 **Persistent memory** across sessions
- 🔗 **Multi-tool integration** (Claude, Copilot, Cursor, Continue)
- 📁 **Project isolation** - memories stay with your projects
- 🎨 **Visual interface** in VS Code

## Quick Setup

```bash
# 1. Clone and install
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install

# 2. Build
bun run build

# 3. You're ready!
```

## Your First Memory

### Using CLI

```bash
# Add a memory
bun run dev:cli add \
  --content "We use React 19 with Server Components" \
  --type "fact" \
  --source "architecture-decision"

# Search for it
bun run dev:cli search "React"

# List all memories
bun run dev:cli list
```

### Using VS Code Extension

1. Press `F5` in VS Code (opens Extension Development Host)
2. Click the Cortex icon in the sidebar
3. Click "Add Memory" or use Command Palette: `Cortex: Add Memory`
4. Fill in the details and save

## Memory Types

Cortex supports 5 types of memories:

| Type | Description | Example |
|------|-------------|---------|
| **fact** | Technical facts about your project | "Uses PostgreSQL database" |
| **decision** | Architecture or design decisions | "Chose tRPC over REST for type safety" |
| **code** | Code patterns or conventions | "All API routes use async/await" |
| **config** | Configuration information | "API key stored in .env as API_KEY" |
| **note** | General notes or reminders | "TODO: Refactor auth module" |

## Integrate with AI Tools

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

Restart Claude. Now you can ask:
```
"Remember that we use React 19 with Server Components"
"What database are we using?"
"Search memories for authentication"
```

### VS Code + GitHub Copilot

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "cortex": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "C:\\Code\\Cortex\\packages\\mcp-server\\dist\\mcp-server.js"]
    }
  }
}
```

Restart VS Code. Copilot now has access to your project memories!

## Example Workflow

Let's set up a new project with Cortex:

```bash
# 1. Start a new project
mkdir my-app && cd my-app
git init

# 2. Add project facts
cortex add -c "Using Next.js 15 with App Router" -t "fact" -s "setup"
cortex add -c "Using Tailwind CSS with shadcn/ui" -t "fact" -s "setup"
cortex add -c "Decided on Prisma over Drizzle for better DX" -t "decision" -s "database"

# 3. Ask your AI assistant
# "Create a new page component"
# -> AI will automatically use Next.js 15 App Router patterns
# -> AI will style it with Tailwind
# -> AI will use Prisma for database queries
```

## Common Commands

```bash
# Add memory
cortex add -c "content" -t "type" -s "source"

# Search memories
cortex search "query"

# List all memories
cortex list

# List by type
cortex list --type fact

# Get statistics
cortex stats

# Delete a memory
cortex delete <id>

# Clear all memories in current project
cortex clear
```

## Understanding Project Isolation

Cortex automatically detects your project and isolates memories:

```bash
# In project A
cd ~/projects/project-a
cortex add -c "Uses Express.js" -t "fact" -s "setup"

# In project B
cd ~/projects/project-b
cortex add -c "Uses Fastify" -t "fact" -s "setup"

# Each project has its own memories!
cortex list  # Shows only project B memories
```

Project detection uses:
1. Git repository root (preferred)
2. package.json location
3. Directory path (fallback)

## Next Steps

Now that you're set up:

1. **Explore the CLI** - [CLI Usage Guide](../guides/cli-usage.md)
2. **Integrate with your AI tools** - [MCP Integration](../guides/mcp-integration.md)
3. **Use the VS Code extension** - [Extension Guide](../guides/vscode-extension.md)
4. **Learn about project isolation** - [Project Isolation Guide](../guides/project-isolation.md)

## Tips

💡 **Add memories as you code** - Make it a habit to record important decisions

💡 **Use descriptive sources** - Makes it easier to find related memories later

💡 **Tag everything** - Use tags to organize related memories

💡 **Review regularly** - Check `cortex stats` to see what you've recorded

## Examples

See [Examples](./examples.md) for more real-world use cases.

---

**Having issues?** Check [Common Issues](../troubleshooting/common-issues.md) or [open an issue](https://github.com/EcuaByte-lat/Cortex/issues).
