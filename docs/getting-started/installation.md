# Installation

Cortex runs on [Bun](https://bun.sh) and keeps its engineering-state record
local to each project by default.

## Prerequisites

- [Bun](https://bun.sh) 1.x
- Git
- VS Code, if you want the editor extension

Verify Bun is available:

```bash
bun --version
```

## Published CLI

From the repository you want to configure, run:

```bash
bunx @ecuabyte/cortex-cli setup
```

For a reusable installation:

```bash
bun add --global @ecuabyte/cortex-cli
cortex setup
```

`setup` detects supported editors, writes project-scoped agent instructions,
installs optional repository bridges, and scans the current project. Review
generated files before committing them.

## Install from source

Use this path when contributing to Cortex or testing unreleased changes:

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install
bun run build
bun run typecheck
bun run test:all
```

To run the development CLI directly:

```bash
bun --cwd packages/cli run dev -- --help
```

## MCP server

The published server can be registered with an MCP client using:

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

See the [universal setup guide](../UNIVERSAL_SETUP.md) for Claude, Cursor,
Windsurf, Goose, Gemini, Zed, and other supported clients.

## VS Code extension

Install [Cortex: Engineering State](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)
from the Marketplace, then open a project and use the Cortex view in the
Activity Bar. The extension provides project scanning, context records, tool
discovery, and MCP setup.

For extension development:

```bash
cd packages/vscode-extension
bun install
bun run build
```

## Verify a handoff

After installation, exercise the local continuity flow:

```bash
cortex start "Implement database migrations" \
  --acceptance "Migration tests pass" \
  --agent codex

cortex capture --task <taskId> --attempt <attemptId> \
  --kind decision \
  --summary "Keep migrations reversible" \
  --source human

cortex handoff --task <taskId> --attempt <attemptId> \
  --next "Run the migration test suite"

cortex resume <taskId>
cortex detect <taskId>
cortex verify --task <taskId> --attempt <attemptId> \
  --summary "Migration tests pass" \
  --source test
```

## Troubleshooting

### `bun` is not recognized

Install Bun, restart the terminal, and confirm that `bun --version` works.

### The build cannot find a workspace package

Run `bun install` from the repository root before building an individual
package.

### Database or project-state issues

Cortex stores local state under `.cortex/` for the current project. Inspect the
active configuration and preserve any handoff data before removing local
files.

## Next steps

- [Quick start](./quick-start.md)
- [Examples](./examples.md)
- [Universal MCP setup](../UNIVERSAL_SETUP.md)
- [Supported tools](../SUPPORTED_TOOLS.md)
- [Handoff contract](../architecture/HANDOFF_CONTRACT.md)
- [Support](../../.github/SUPPORT.md)

## Updating

For a source checkout:

```bash
git pull origin main
bun install
bun run build
```

For the published CLI, update the global package:

```bash
bun update --global @ecuabyte/cortex-cli
```

## Uninstalling

Remove the global CLI if installed:

```bash
bun remove --global @ecuabyte/cortex-cli
```

Project state is separate from the package. Remove `.cortex/` only after
exporting or no longer needing its local records.
