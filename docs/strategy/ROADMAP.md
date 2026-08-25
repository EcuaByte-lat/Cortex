# Cortex Roadmap

**Status:** Canonical execution plan  
**Updated:** 2026-08-25  
**North star:** Verified continuations per active project per week

## Product decision

Cortex is the open, local-first task reliability layer for agentic software engineering.

It consumes lifecycle events from agent runtimes, Git, CI, pull requests, and issue systems; canonicalizes them into an evidence-backed task record; and returns the current state, a portable handoff, and the next safe action.

```text
intent -> agent attempt -> changes -> evidence -> verification -> handoff -> next step
```

Cortex does not run agents, proxy model tokens, replace Git/CI, or compete as a generic session recorder. MCP is the query/action surface. Hooks, Git, CI, and review systems are the event and evidence sources.

## What is already in the repository

- `ContinuityStore` for local tasks, attempts, events, evidence, and handoffs.
- `AgentBridge` for redaction, deduplication, task attachment, and lifecycle normalization.
- CLI and MCP commands for start, status, resume, capture, handoff, verify, and drift detection.
- VS Code continuity cockpit.
- Provider adapters for Codex, Claude, Cursor, Gemini, and OpenCode.
- Installer support for MCP configuration, project instructions, Claude lifecycle hooks, OpenCode plugin capture, and Git evidence hooks.

The old generic memory store remains available for compatibility. It is a projection and migration surface, not the product north star.

## Execution order

### Phase 0 — Unify the continuity spine

**Target:** 0–6 weeks

Build:

- Version the canonical event envelope and preserve unknown provider fields safely.
- Make task identity survive sessions, agents, branches, worktrees, and machines.
- Capture high-signal events automatically; store selected provenance rather than full transcripts by default.
- Make freshness, supersession, conflicts, authority, and redaction first-class.
- Make `resume`, `status`, and `handoff` useful without a mandatory manual `start` or `capture` step.
- Keep ingestion idempotent, local-first, and fail-open for developer workflows.
- Add Git hooks for commit, checkout, merge, and push evidence.

Exit criteria:

- A first prompt or project event creates or attaches to a task when a supported lifecycle source is available.
- A second agent can resume from one compact packet with evidence and next actions.
- Capture failures never block an agent, commit, or push.
- No secret or full transcript is persisted by default.

### Phase 1 — Automatic Continuity Cockpit

**Target:** 6–12 weeks

Make the VS Code extension the activation surface while keeping CLI, MCP, and hooks headless and provider-neutral.

Build:

- Active task list with current, stale, blocked, and unverified states.
- Evidence health and conflict inspector.
- Resume, handoff, verify, and explain-change actions.
- Small provider packs: hooks/configuration/skills for Claude Code, Gemini CLI, and VS Code where supported; MCP and project instructions for Codex; adapters/fallbacks for Cursor and OpenCode.
- One provider-neutral setup command: `cortex setup`.

Exit criteria:

- Install-to-first-handoff works locally in under ten minutes.
- The extension and CLI read the same continuity record.
- A project can switch agent vendors without rebuilding its context manually.

### Phase 2 — Verified Delivery

**Target:** 12–20 weeks

Connect Cortex to engineering truth instead of building another agent dashboard.

Build:

- Git commit, branch, worktree, and diff evidence.
- CI test and build evidence.
- GitHub Action that publishes a portable checkpoint artifact.
- PR check for missing evidence, stale context, unresolved blockers, and unverified acceptance criteria.
- GitHub first, GitLab second.
- Line/file/commit-to-task explanation links.

Exit criteria:

- A reviewer can inspect a handoff without a Cortex account.
- Verification distinguishes observed agent claims from Git, CI, tool, and human evidence.
- Public benchmarks show reduced resumption time and repeated investigation against Markdown-only and no-memory baselines.

### Phase 3 — Shared Workspaces

**Target:** 20–36 weeks

Introduce paid collaboration only after local continuity is repeatedly useful.

Build:

- Sync tasks, attempts, decisions, evidence, handoffs, and artifact metadata.
- Cross-machine and cross-agent continuation.
- Workspace membership, retention, search, and audit export.
- Privacy boundary that excludes code and raw transcripts by default.
- Self-hosted/BYOC path and provider-neutral API.

Commercial packaging:

- Free/open source: local CLI, MCP, extension, exports, and useful handoffs.
- Team: shared workspaces, PR/CI checks, history, retention, and analytics.
- Enterprise: SSO/RBAC, policy controls, audit, data residency, self-hosting, and support.

### Phase 4 — Provenance and Governance

**Target:** after product-market fit

Build:

- Agent-generated change inventory and provenance.
- Policy-as-code at hook, CI, and PR boundaries.
- Allow/ask/deny controls for high-risk actions.
- Incident attribution, compliance exports, legal hold, and enterprise deployment controls.

Use provider-native governance where it exists. Cortex should connect and enrich those controls, not become a universal agent gateway.

## Metrics and gates

Measure outcomes, not event volume:

- Time from session start to useful resume.
- Percentage of tasks captured without manual intervention.
- Percentage of handoffs that lead to the next verified milestone.
- Repeated files, commands, and investigations after a handoff.
- Stale or contradictory evidence detected before work continues.
- Projects with a second actor consuming a handoff.
- Paid workspaces that expand to additional repositories.

Do not expand integrations or cloud infrastructure until the previous phase demonstrates improved continuation outcomes.

## Explicit non-goals

- New agent runtime or cloud execution environment.
- Generic vector memory or transcript warehouse.
- Distributed Git or a mirror of repository history.
- Generic LLM observability and token billing.
- Universal MCP gateway.
- Enterprise governance before local and team retention are proven.
