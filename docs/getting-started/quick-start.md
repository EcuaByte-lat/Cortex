# Quick Start

Get the current Cortex foundation running in under 5 minutes. The verified handoff lifecycle is the product direction; the commands marked as planned are not yet implemented.

## Option 1: VS Code Extension (Recommended)

1. **Install from Marketplace**
   - Search "Cortex" in VS Code Extensions
   - Or install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)

2. **Open your project**
   - Open any project in VS Code

3. **Run project scan**
   - Click the brain icon (🧠) in the Activity Bar
   - Click **✨ AI Scan** button
   - Watch as Cortex analyzes your project and extracts candidate project context

4. **Connect an MCP client**
   - Configure Cortex using [Universal setup](../UNIVERSAL_SETUP.md)
   - Treat the current integration as context transport; reliable capture, handoff, resume, and verification are planned capabilities

## Option 2: CLI

```bash
# Clone the repository
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex

# Install dependencies
bun install

# Build all packages
bun run build

# Add a current project fact or decision (legacy-compatible foundation)
bun --cwd packages/cli run dev add \
  -c "We use PostgreSQL with Prisma ORM for database operations" \
  -t "decision"

# Search memories
bun --cwd packages/cli run dev search "database"

# Retrieve context for a task
bun --cwd packages/cli run dev context "setting up database migrations"
```

## Option 3: MCP Server

For Claude Desktop, Cursor, or other MCP clients:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

Then in Claude/Cursor, you can query project context. Do not treat a retrieved item as verified unless its source, scope, and freshness are clear.

## Current record types

| Type | Use For |
|------|---------|
| `fact` | Technical facts (versions, stack) |
| `decision` | Architectural decisions |
| `code` | Code patterns and examples |
| `config` | Configuration details |
| `note` | General notes |

## Next Steps

- [Product direction](../strategy/PRODUCT_DIRECTION.md) - Reliable engineering state and handoffs
- [Handoff contract](../architecture/HANDOFF_CONTRACT.md) - Planned domain contract
- [Development Guide](../DEVELOPMENT.md) - Contributing to Cortex
- [Examples](./examples.md) - More usage examples
