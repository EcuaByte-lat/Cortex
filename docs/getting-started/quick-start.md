# Quick Start

Get Cortex connected to a repository in under five minutes. Cortex keeps a local, project-scoped record of tasks, evidence, decisions, and handoffs so another agent can continue without reconstructing the work.

## 1. Install the CLI

Install [Bun](https://bun.sh) 1.x, then run this from the repository you want to configure:

```bash
bunx @ecuabyte/cortex-cli setup
```

For a reusable installation:

```bash
bun add --global @ecuabyte/cortex-cli
cortex setup
```

The setup command configures detected editors, writes project-scoped agent instructions, and scans the current project. Review generated files before committing them.

## 2. Start a task

```bash
cortex start "Implement database migrations" \
  --acceptance "Migration tests pass" \
  --agent codex
```

Save the returned `taskId` and `attemptId`. Capture high-signal evidence as you work:

```bash
cortex capture \
  --task <taskId> \
  --attempt <attemptId> \
  --kind decision \
  --summary "Keep migrations reversible" \
  --source human
```

## 3. Hand off the work

Before switching agents or machines, create a portable handoff:

```bash
cortex handoff \
  --task <taskId> \
  --attempt <attemptId> \
  --next "Run the migration test suite"
```

The response includes machine-readable JSON and human-readable Markdown.

## 4. Resume and verify

In the next session:

```bash
cortex resume <taskId>
cortex detect <taskId>
cortex verify \
  --task <taskId> \
  --attempt <attemptId> \
  --summary "Migration tests pass" \
  --source ci
```

`detect` reports branch, commit, worktree, or remote drift before you trust a stale packet.

## MCP clients

For Claude Desktop, Cursor, or another MCP client, use:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bunx",
      "args": ["@ecuabyte/cortex-mcp-server"]
    }
  }
}
```

See the [universal setup guide](../UNIVERSAL_SETUP.md) for editor-specific configuration and the [capability matrix](../SUPPORTED_TOOLS.md) for current support levels.

## From source

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install
bun run build
bun run typecheck
bun run test:all
```

Read the [handoff contract](../architecture/HANDOFF_CONTRACT.md) to understand the record model and verification boundaries.
