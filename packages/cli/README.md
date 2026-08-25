# `@ecuabyte/cortex-cli`

The local command-line runtime for Cortex. It installs the open-source
continuity workflow, captures high-signal agent and Git events, and exposes
portable task handoffs for humans and coding agents.

## Install and activate

```bash
bunx @ecuabyte/cortex-cli setup
```

The CLI requires Bun 1.x. `setup` configures detected MCP clients, preserves
existing project instructions, installs supported lifecycle/Git capture
surfaces, and scans the current repository. Use `install --project .` when you
do not want to scan.

## Continuity commands

```bash
cortex start "Implement the API migration"
cortex status
cortex resume
cortex handoff --task <task-id> --attempt <attempt-id> --next "Run CI"
cortex verify --task <task-id> --attempt <attempt-id> \
  --summary "CI passed" --source ci
```

Provider adapters can receive one JSON event on stdin:

```bash
printf '%s\n' '{"hook":"post-commit","commit":"abc123"}' \
  | cortex bridge ingest --provider git
```

Supported bridge providers are `claude`, `codex`, `cursor`, `gemini`,
`opencode`, and `git`. Ingestion is deduplicated, redacted, local-first, and
fail-open at the generated hook boundary.

## Documentation

- [Quick start](../../docs/getting-started/quick-start.md)
- [Universal setup](../../docs/UNIVERSAL_SETUP.md)
- [Handoff contract](../../docs/architecture/HANDOFF_CONTRACT.md)
- [Roadmap](../../docs/strategy/ROADMAP.md)

## Development

```bash
bun run build
bun run test:cli
```

## License

MIT
