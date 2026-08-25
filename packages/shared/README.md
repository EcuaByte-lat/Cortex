# `@ecuabyte/cortex-shared`

Shared contracts for Cortex integrations. This package keeps the CLI, core,
MCP server, dashboard, extension, and provider adapters aligned around the same
continuity vocabulary.

## Shared contracts

- `AgentEvent` and lifecycle event types.
- Tasks, attempts, evidence, handoffs, repository context, and verification.
- Dashboard snapshots and command schemas.
- Legacy memory types and constants for compatibility.

The canonical product relationship is:

```text
task -> attempt -> evidence -> artifact -> verification -> handoff
```

This package contains types and pure utilities only. Persistence belongs in
`@ecuabyte/cortex-core`; provider capture belongs in adapters.

## Development

```bash
bun --cwd packages/shared test
bun run typecheck
```

See the [handoff contract](../../docs/architecture/HANDOFF_CONTRACT.md) and
[architecture docs](../../docs/architecture/README.md).

## License

MIT
