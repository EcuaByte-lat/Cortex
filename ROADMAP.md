# Cortex Roadmap

## Vision

Become the reliable, portable state plane for software work performed by humans and coding agents.

## Product wedge

> Agent A stops or hands off a task; Agent B resumes it from a compact, evidence-linked packet and reaches the next verified milestone without repeating the investigation.

The roadmap is ordered by proof of continuation value, not by protocol breadth. Cortex should not build a universal memory graph, federation layer, or hosted platform before proving that verified handoffs improve engineering outcomes.

## Platform strategy (research-backed, 2026-08-14)

The canonical state belongs in the local-first Cortex project record. Platforms should receive projections of that state through MCP, CLI commands, generated instruction files, and workflow artifacts; they should not become separate memory silos.

| Priority | Surface | First integration | Why it is prioritized |
|---|---|---|---|
| P0 | Local CLI + MCP | `cortex` CLI, local MCP server, Git/shell/test capture | Common denominator across agents, machines, hooks, and CI |
| P0 | GitHub | Action, PR artifact, check, issue/PR templates | Concentrates issues, branches, commits, CI, review, and agent handoffs |
| P0 | VS Code / Open VSX | Resume task, evidence tree, verification state, MCP setup | Broad editor distribution and a host for multiple coding agents |
| P1 | Claude Code, Codex, GitHub Copilot | MCP/config recipes, hooks, plugins, CLI handoff commands | High-intensity agent workflows and cross-session continuity |
| P1 | Cursor | MCP, CLI, and versioned rule projections | Large AI-editor usage with low integration cost through shared protocols |
| P2 | JetBrains, Gemini CLI, Cline, Zed | MCP/ACP recipes before native plugins | Expands reach after the core handoff loop is retained |
| P2 | Slack, Teams, Google Workspace, Microsoft 365 | High-signal decision and approval capture | Context sources and handoff destinations, not canonical engineering truth |
| P3 | Windsurf native surface and general-purpose chat apps | Compatibility through MCP/CLI only | Lower confidence that a bespoke integration will retain value |

### Platform rules

- Build one portable state model and one MCP server; add thin host adapters.
- Generate `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.mcp.json`, and `.vscode/mcp.json` as projections, not independent sources of truth.
- Centralize engineering state, provenance, freshness, conflicts, and verification; federate tool execution and keep tokens out of the shared record.
- Treat GitHub as the first verification and distribution plane, not as the only supported source of truth.
- Do not use downloads, stored memories, or raw MCP calls as the primary success metric.

The decision is supported by the 2025 Stack Overflow survey (84% use or plan to use AI, but only 17% report better team collaboration and concerns remain high around accuracy and privacy), GitHub's 2025 Octoverse (180M+ developers and strong early Copilot adoption), Anthropic's Claude Code usage analysis, and the official MCP Registry documentation. These vendor and survey figures are directional and are not directly comparable: [Stack Overflow AI survey](https://survey.stackoverflow.co/2025/ai), [GitHub Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/), [Claude Code usage](https://www.anthropic.com/research/claude-code-expertise), [MCP Registry](https://modelcontextprotocol.io/registry/quickstart).

## Phase 0 - Reposition and baseline (current)

- [x] Adopt the verified engineering state thesis.
- [x] Define canonical records: task, attempt, evidence, decision, artifact, handoff, verification, conflict.
- [x] Publish market, distribution, and adoption strategy.
- [x] Record the platform order: local CLI/MCP, GitHub, and VS Code first; agent adapters next; team and enterprise surfaces later.
- [ ] Restore the public README around handoffs and project state.
- [ ] Create a benchmark repository with no-memory, Markdown, generic-memory, and Cortex baselines.
- [ ] Define a versioned handoff schema and fixture corpus.

## Phase 1 - Local handoff MVP

- [ ] Ship the local `cortex` CLI and MCP server as the common integration surface.
- [ ] `cortex start` creates or resumes a task scoped to repository, branch, and commit.
- [ ] `cortex capture` records high-signal events: decisions, commands, files, tests, blockers, and artifacts.
- [ ] `cortex handoff` emits human-readable Markdown and machine-readable JSON.
- [ ] `cortex resume` retrieves a bounded packet for the current task and repository state.
- [ ] `cortex verify` marks evidence and claims confirmed, failed, stale, superseded, or unverified.
- [ ] Implement structured provenance, authority, freshness, and supersession.
- [ ] Keep local-only operation and complete export/import.
- [ ] Provide thin setup projections for Claude Code, Codex, GitHub Copilot, Cursor, Gemini CLI, Cline, and Zed; do not create provider-specific memory stores.
- [ ] Add integration tests for two sessions and concurrent CLI/MCP access.

Exit gate: benchmarked median resumption time improves by at least 25%, and 80% of packets are sufficient to continue.

## Phase 2 - Repository-native distribution

- [ ] GitHub Action captures commits/tests and publishes a handoff artifact.
- [ ] PR check reports missing evidence, stale context, and unresolved conflicts.
- [ ] Issue and PR templates include task, acceptance, handoff, and verification fields.
- [ ] Official MCP Registry and npm/Bun package distribution for the MCP server and CLI.
- [ ] VS Code/Open VSX experience: Resume task, evidence tree, verification state, and project-scoped MCP setup.
- [ ] GitHub Marketplace packaging for the Action; defer a GitHub App until the artifact loop is retained.
- [ ] Public benchmark reports and reproducible examples.

Exit gate: 60% of activated projects produce a second handoff within four weeks.

## Phase 3 - Multi-agent and team continuity

- [ ] Stable agent identity and attempt/session records.
- [ ] Shared project workspace with explicit actor and repository scopes.
- [ ] GitHub/GitLab integration and remote sync with conflict handling.
- [ ] Team membership, retention, audit export, and workspace analytics.
- [ ] MCP remote transport where it improves collaboration; local remains first-class.
- [ ] Slack, Teams, Google Workspace, Microsoft 365, Jira, and Linear adapters only for high-signal decisions, approvals, blockers, and handoff destinations.
- [ ] JetBrains, Gemini CLI, Cline, and Zed integrations after the common MCP/CLI path demonstrates repeated use.
- [ ] Optional OpenTelemetry correlation for agent/tool/task events.

Exit gate: 40% of active projects have a second actor consume a handoff and at least three teams pay for shared functionality.

## Phase 4 - Governance and enterprise deployment

- [ ] SSO/RBAC, policy enforcement, approvals, and evidence retention.
- [ ] BYOC, self-hosted Docker/Helm, private networking, and regional data controls.
- [ ] GitHub/GitLab/Bitbucket, Jira/Linear, CI, and Slack/Teams integrations where they improve an existing handoff event.
- [ ] Optional MCP policy gateway, registry, routing, and tool observability only when customer demand is specifically about governance rather than memory retrieval.
- [ ] AWS/Azure/GCP Marketplace listings and private-offer procurement.
- [ ] Security, deletion, export, and incident-response documentation.

## Explicitly deferred

- [ ] Generic universal knowledge graph.
- [ ] Consumer or personal-life memory.
- [ ] New agent runtime or MCP registry.
- [ ] Universal MCP gateway/catalog as the core product.
- [ ] Replicating separate memories inside every agent vendor.
- [ ] Broad native plugins for platforms that can be covered by MCP/CLI without a measured continuation workflow.
- [ ] A2A replacement or proprietary agent protocol.
- [ ] CRDT/federation/zero-knowledge features before multi-user state is proven.
- [ ] Broad marketplace integrations without a measured continuation workflow.

## North-star metric

**Verified continuations per active project per week.** Downloads, stored records, raw MCP calls, and dashboard views are supporting metrics only.
