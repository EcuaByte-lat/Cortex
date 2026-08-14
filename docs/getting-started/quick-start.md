# Quick Start

Get the current Cortex foundation running in under 5 minutes. Cortex stores a provider-neutral task, evidence, and handoff record so another agent can continue the work.

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
   - Use the MCP tools `cortex_start`, `cortex_capture`, `cortex_handoff`, `cortex_resume`, `cortex_detect`, and `cortex_verify` for the continuity lifecycle

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

# Start a durable task for the current repository
bun --cwd packages/cli run dev start "Implement database migrations" \
  --acceptance "Migration tests pass" \
  --agent codex

# The command returns taskId and attemptId. Reuse them while working.
bun --cwd packages/cli run dev capture \
  --task <taskId> --attempt <attemptId> \
  --kind decision --summary "Keep migrations reversible" --source human

# Before changing agents, export JSON and Markdown in one response
bun --cwd packages/cli run dev handoff \
  --task <taskId> --attempt <attemptId> \
  --next "Run the migration test suite"

# The next agent can retrieve and check freshness
bun --cwd packages/cli run dev resume <taskId>
bun --cwd packages/cli run dev detect <taskId>
```

## Agent Bridge (Codex and OpenCode)

To capture lifecycle events automatically in a repository, install the native
integrations from the repository root:

```bash
cortex install --project .
```

This writes project-scoped Codex hooks to `.codex/hooks.json` and an OpenCode
plugin to `.opencode/plugins/cortex.ts`. Both adapters send normalized events
to the same local ContinuityStore used by the CLI and MCP server. The bridge
deduplicates retries and redacts sensitive values before evidence is persisted.
The generated integrations invoke the `cortex` executable with Bun, which is
the runtime required by Cortex's local SQLite layer.

For a smoke test without an installed agent, send one normalized provider
payload through stdin:

```bash
export CORTEX_CONTINUITY_DB="$PWD/.cortex/bridge-smoke.db"
printf '%s\n' '{"hook_event_name":"UserPromptSubmit","session_id":"demo-session","prompt":"Implement the login flow","cwd":"'"$PWD"'"}' \
  | cortex bridge ingest --provider codex
```

The command returns JSON with `accepted`, `duplicate`, `task`, `attempt`, and
any captured `evidence` or `handoff`. Replaying the same event is safe and
returns `duplicate: true`.

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
