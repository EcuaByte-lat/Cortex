# Cortex: Engineering Continuity for VS Code

The VS Code cockpit for Cortex: inspect active agent tasks, evidence, blockers,
freshness, verification, and portable handoffs without leaving the editor.

Cortex is local-first and open source. The extension is the visual surface; the
CLI, MCP server, hooks, plugins, and Git adapters provide the headless workflow.

## 📚 Central Documentation

For setup and product direction, start with the [universal setup guide](../../docs/UNIVERSAL_SETUP.md),
[supported tools](../../docs/SUPPORTED_TOOLS.md), and [roadmap](../../docs/strategy/ROADMAP.md).

## What the extension provides

- Continuity cockpit for the active task and attempt.
- Timeline of normalized lifecycle events.
- Evidence and verification health.
- Current, stale, blocked, completed, and unverified task states.
- Task selection and handoff/resume actions.
- Project context and tool discovery for the existing workspace.
- Optional model-assisted scanning through configured providers.

The extension does not replace the agent runtime, Git, CI, or MCP. It reads the
same local continuity record used by the CLI and MCP server.

## Useful commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

- `Cortex: Open Dashboard`
- `Cortex: Capture Context`
- `Cortex: Search Project State`
- `Cortex: Scan Project`
- `Cortex: Refresh`

## Development

```bash
bun install
bun run build:extension
bun test packages/vscode-extension
```

The extension package is built with the monorepo and can be packaged as a VSIX
for local testing.

---

## License
MIT
