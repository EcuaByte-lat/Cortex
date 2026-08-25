# `@ecuabyte/cortex-mcp-server`

The Model Context Protocol server for Cortex. It gives compatible agents a
provider-neutral way to start/resume tasks, capture evidence, create handoffs,
detect repository drift, and record verification.

## Quick start

```bash
bunx @ecuabyte/cortex-mcp-server
```

For a generated client configuration:

```bash
bunx @ecuabyte/cortex-mcp-server generate-config --target claude
```

The server requires Bun 1.x and uses the local ContinuityStore by default. MCP
is the query/action surface; lifecycle capture comes from hooks, plugins, Git,
and CI adapters.

## Continuity tools

- `cortex_start`
- `cortex_status`
- `cortex_capture`
- `cortex_handoff`
- `cortex_resume`
- `cortex_detect`
- `cortex_verify`

Agents should treat summaries as unverified until supported by Git, tests, CI,
tools, files, or human approval.

## Documentation

- [Universal setup](../../docs/UNIVERSAL_SETUP.md)
- [Supported tools](../../docs/SUPPORTED_TOOLS.md)
- [Handoff contract](../../docs/architecture/HANDOFF_CONTRACT.md)
- [Roadmap](../../docs/strategy/ROADMAP.md)

## Development

```bash
bun --cwd packages/mcp-server test
bun run build:mcp
```

## License
MIT
