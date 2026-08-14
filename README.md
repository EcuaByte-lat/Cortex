# Cortex

> Reliable, evidence-backed handoffs for coding agents.

Cortex preserves the state of software work so a human or coding agent can resume a task across sessions, tools, vendors, and machines without repeating the investigation or trusting stale assumptions.

```text
task -> attempt -> evidence -> decision -> artifact -> verification -> handoff
```

## The product wedge

Agent A investigates or implements a task. Agent B resumes it later. Cortex produces a compact, portable handoff containing the repository, branch, commit, files, commands, tests, decisions, blockers, evidence, and next safe action.

Cortex is not a generic personal-memory assistant, a replacement for Git/CI/issues, an agent runtime, or an MCP registry. MCP is the access surface; the product value is trustworthy project state and verified continuation.

## Current status

The repository currently provides a local SQLite/FTS5 foundation, a CLI, an MCP server, context routing/guarding/fusing, a project scanner, and a VS Code extension. The structured handoff lifecycle is the next product milestone and is documented as planned until implemented and tested.

Do not interpret an MCP connection as proof that capture, handoff, resume, or verification is fully supported by an integration. See the [capability matrix](./docs/SUPPORTED_TOOLS.md).

## Install and explore the current foundation

```bash
bun install
bun run dev:cli -- --help
bun run dev:mcp
```

For editor setup, see [Universal setup](./docs/UNIVERSAL_SETUP.md). For the planned product flow, see [Product direction](./docs/strategy/PRODUCT_DIRECTION.md).

## Strategic documents

- [Strategy index](./docs/strategy/README.md)
- [Product direction](./docs/strategy/PRODUCT_DIRECTION.md)
- [Market research](./docs/strategy/MARKET_RESEARCH.md)
- [Distribution](./docs/strategy/DISTRIBUTION.md)
- [Adoption and compounding](./docs/strategy/ADOPTION.md)
- [Handoff contract](./docs/architecture/HANDOFF_CONTRACT.md)
- [Roadmap](./ROADMAP.md)
- [Security policy](./SECURITY.md)

## Privacy boundary

Cortex is local-first, but local-first does not mean that every operation is guaranteed to be offline. Embeddings or other providers may receive data when explicitly configured. The product must make egress visible, configurable, and testable; it must not promise that code never leaves the machine without verifying the active configuration.

## Development principles

1. Evidence before memory.
2. Project state before personal preference.
3. Append raw signals before deriving summaries.
4. Freshness, authority, and provenance are product data.
5. Export and deletion are first-class.
6. Integrations must improve a measured handoff event.
7. The north-star metric is verified continuations per active project per week.

## License

MIT. See [LICENSE](./LICENSE).
