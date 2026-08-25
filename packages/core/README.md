# `@ecuabyte/cortex-core`

The local-first domain runtime for Cortex. It stores and projects the
evidence-backed engineering state that lets work continue across agent
sessions, tools, branches, and machines.

## Responsibilities

- Project-isolated SQLite/FTS5 memory compatibility store.
- Canonical tasks, attempts, events, evidence, artifacts, and handoffs.
- Repository-aware resume and branch/commit drift detection.
- Verification records with source, authority, status, and freshness.
- Agent bridge redaction and event deduplication.
- Markdown and JSON handoff projections.

The core package does not execute agents, call GitHub, or provide a hosted
workspace. Those concerns belong to adapters in the CLI, MCP server, extension,
and future team services.

## Key entry points

- `ContinuityStore` — canonical task and evidence state.
- `AgentBridge` — normalized lifecycle ingestion.
- `MemoryStore` — legacy/context compatibility API.
- `renderContinuityHandoffMarkdown` — portable handoff output.

For the domain contract, read the [handoff contract](../../docs/architecture/HANDOFF_CONTRACT.md).

## Development

```bash
bun --cwd packages/core test
bun run typecheck
```

## License

MIT
