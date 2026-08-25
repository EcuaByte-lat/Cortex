<div align="center">
  <a href="https://github.com/EcuaByte-lat/Cortex">
    <img src="docs/branding/svg/cortex-logo-horizontal.svg" alt="Cortex" width="320" />
  </a>

  <p><strong>Resume engineering work with evidence.</strong></p>

  <p>
    <a href="https://github.com/EcuaByte-lat/Cortex/actions/workflows/unified.yml"><img src="https://github.com/EcuaByte-lat/Cortex/actions/workflows/unified.yml/badge.svg?branch=main" alt="CI status" /></a>
    <a href="https://www.npmjs.com/package/@ecuabyte/cortex-cli"><img src="https://img.shields.io/npm/v/@ecuabyte/cortex-cli?label=CLI" alt="CLI on npm" /></a>
    <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/EcuaByte.cortex-vscode?label=VS%20Code" alt="VS Code extension" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-8B5CF6.svg" alt="MIT license" /></a>
  </p>
</div>

Cortex is an open-source, local-first task reliability layer for agentic software engineering. It links tasks, attempts, evidence, decisions, artifacts, verification, and handoffs so a human or another agent can continue from the latest trustworthy state.

```text
task → attempt → evidence → decision → artifact → verification → handoff
```

> Agent A stops. Cortex records what happened and why. Agent B resumes with the repository state, evidence, blockers, and next safe action already in view.

## Why Cortex

Coding work is scattered across chat sessions, branches, issue comments, Markdown files, Git history, CI logs, and human memory. Cortex connects those signals without replacing Git, CI, issue trackers, or the agent runtime.

- **Evidence before memory:** claims keep their source, authority, scope, and freshness.
- **Repository-aware:** task state is scoped to the repository, branch, commit, and worktree.
- **Local-first:** start with an inspectable local record; add synchronization only when it creates team value.
- **Portable:** consume the same state from the CLI, MCP, VS Code, Codex, OpenCode, and other compatible agents.
- **Honest by design:** an agent summary is not treated as verified until Git, tests, CI, tools, files, or a human support it.

## What works today

| Surface | Available now |
| --- | --- |
| CLI | `setup`, `install`, project scan, search, task start/resume, evidence capture, handoff, drift detection, and verification |
| MCP server | Project-scoped context plus the continuity tools `cortex_start`, `cortex_capture`, `cortex_handoff`, `cortex_resume`, `cortex_detect`, and `cortex_verify` |
| VS Code | Project scanning, context records, tool discovery, model-assisted analysis, and MCP setup |
| Storage | Local SQLite with FTS5 search and project isolation |
| Agent automation | Claude lifecycle hooks, Codex MCP/project instructions, OpenCode plugin capture, and fail-open Git evidence hooks |

See the [capability matrix](./docs/SUPPORTED_TOOLS.md) for transport and editor-specific support. The lifecycle is implemented in the CLI/MCP foundation; integrations are intentionally tracked separately from the core record.

## Automatic continuity

Run `cortex setup` once in a repository. Cortex configures the available MCP
clients and project instructions, then installs fail-open capture surfaces:

| Surface | Role |
| --- | --- |
| Claude Code hooks | Capture session, prompt, tool, compaction, and end events |
| Codex | Register Cortex as MCP and provide project-level instructions |
| OpenCode plugin | Capture native session and tool lifecycle events |
| Git hooks | Record commit, checkout, merge, and push evidence |
| VS Code | Show the continuity cockpit and active task state |

Capture never blocks an agent, commit, or push. Cortex stores selected
engineering signals locally; full transcripts, source contents, and secrets are
not captured by default. See the [universal setup guide](./docs/UNIVERSAL_SETUP.md).

## Quick start

### Use the published CLI

[Install Bun](https://bun.sh) 1.x, then run this from the repository you want to connect:

```bash
bunx @ecuabyte/cortex-cli setup
```

This configures detected editors, writes project-scoped agent instructions, and scans the current project. For a reusable installation, install the CLI globally:

```bash
bun add --global @ecuabyte/cortex-cli
cortex setup
```

### Create and hand off a task

```bash
cortex start "Implement database migrations" --acceptance "Migration tests pass" --agent codex
# Capture the taskId and attemptId from the JSON response.
cortex capture --task <taskId> --attempt <attemptId> \
  --kind decision --summary "Keep migrations reversible" --source human
cortex handoff --task <taskId> --attempt <attemptId> \
  --next "Run the migration test suite"

# In the next session or agent:
cortex resume <taskId>
cortex detect <taskId>
cortex verify --task <taskId> --attempt <attemptId> \
  --summary "Migration tests pass" --source ci
```

### Connect an MCP client manually

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

Use the [universal setup guide](./docs/UNIVERSAL_SETUP.md) for Cursor, Windsurf, Claude, Gemini, Codex, OpenCode, Zed, and compatible MCP clients.

## Development

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install
bun run build
bun run typecheck
bun run test:all
```

Useful documentation:

- [Quick start](./docs/getting-started/quick-start.md)
- [CLI and editor installation](./docs/getting-started/installation.md)
- [MCP and universal setup](./docs/UNIVERSAL_SETUP.md)
- [Architecture and handoff contract](./docs/architecture/HANDOFF_CONTRACT.md)
- [Roadmap](./docs/strategy/ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)
- [Support](./.github/SUPPORT.md)
- [Security policy](./SECURITY.md)

## Product direction

Cortex is not a generic personal-memory assistant, a replacement for Git/CI/issues, an agent runtime, or an MCP registry. Its wedge is verified continuation: fewer repeated investigations, fewer stale assumptions, and a clear next step when work changes hands.

The north-star metric is **verified continuations per active project per week**. Read the [product direction](./docs/strategy/PRODUCT_DIRECTION.md), [market research](./docs/strategy/MARKET_RESEARCH.md), [distribution strategy](./docs/strategy/DISTRIBUTION.md), and [adoption model](./docs/strategy/ADOPTION.md) for the full thesis.

## Privacy boundary

Cortex is local-first, not a promise that every operation is offline. Embeddings or other providers may receive data when explicitly configured. Review the active provider and keep egress visible, configurable, and testable.

## License

MIT. See [LICENSE](./LICENSE).
