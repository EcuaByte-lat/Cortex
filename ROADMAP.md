# Cortex Roadmap

## Vision

Become the reliable, portable state plane for software work performed by humans and coding agents.

## Product wedge

> Agent A stops or hands off a task; Agent B resumes it from a compact, evidence-linked packet and reaches the next verified milestone without repeating the investigation.

The roadmap is ordered by proof of continuation value, not by protocol breadth. Cortex should not build a universal memory graph, federation layer, or hosted platform before proving that verified handoffs improve engineering outcomes.

## Phase 0 - Reposition and baseline (current)

- [x] Adopt the verified engineering state thesis.
- [x] Define canonical records: task, attempt, evidence, decision, artifact, handoff, verification, conflict.
- [x] Publish market, distribution, and adoption strategy.
- [ ] Restore the public README around handoffs and project state.
- [ ] Create a benchmark repository with no-memory, Markdown, generic-memory, and Cortex baselines.
- [ ] Define a versioned handoff schema and fixture corpus.

## Phase 1 - Local handoff MVP

- [ ] `cortex start` creates or resumes a task scoped to repository, branch, and commit.
- [ ] `cortex capture` records high-signal events: decisions, commands, files, tests, blockers, and artifacts.
- [ ] `cortex handoff` emits human-readable Markdown and machine-readable JSON.
- [ ] `cortex resume` retrieves a bounded packet for the current task and repository state.
- [ ] `cortex verify` marks evidence and claims confirmed, failed, stale, superseded, or unverified.
- [ ] Implement structured provenance, authority, freshness, and supersession.
- [ ] Keep local-only operation and complete export/import.
- [ ] Add integration tests for two sessions and concurrent CLI/MCP access.

Exit gate: benchmarked median resumption time improves by at least 25%, and 80% of packets are sufficient to continue.

## Phase 2 - Repository-native distribution

- [ ] GitHub Action captures commits/tests and publishes a handoff artifact.
- [ ] PR check reports missing evidence, stale context, and unresolved conflicts.
- [ ] Issue and PR templates include task, acceptance, handoff, and verification fields.
- [ ] Official MCP Registry, npm/Bun, VS Code, Open VSX, and GitHub Marketplace packaging.
- [ ] Public benchmark reports and reproducible examples.

Exit gate: 60% of activated projects produce a second handoff within four weeks.

## Phase 3 - Multi-agent and team continuity

- [ ] Stable agent identity and attempt/session records.
- [ ] Shared project workspace with explicit actor and repository scopes.
- [ ] GitHub/GitLab integration and remote sync with conflict handling.
- [ ] Team membership, retention, audit export, and workspace analytics.
- [ ] MCP remote transport where it improves collaboration; local remains first-class.
- [ ] Optional OpenTelemetry correlation for agent/tool/task events.

Exit gate: 40% of active projects have a second actor consume a handoff and at least three teams pay for shared functionality.

## Phase 4 - Governance and enterprise deployment

- [ ] SSO/RBAC, policy enforcement, approvals, and evidence retention.
- [ ] BYOC, self-hosted Docker/Helm, private networking, and regional data controls.
- [ ] GitHub/GitLab/Bitbucket, Jira/Linear, CI, and Slack/Teams integrations where they improve an existing handoff event.
- [ ] AWS/Azure/GCP Marketplace listings and private-offer procurement.
- [ ] Security, deletion, export, and incident-response documentation.

## Explicitly deferred

- [ ] Generic universal knowledge graph.
- [ ] Consumer or personal-life memory.
- [ ] New agent runtime or MCP registry.
- [ ] A2A replacement or proprietary agent protocol.
- [ ] CRDT/federation/zero-knowledge features before multi-user state is proven.
- [ ] Broad marketplace integrations without a measured continuation workflow.

## North-star metric

**Verified continuations per active project per week.** Downloads, stored records, raw MCP calls, and dashboard views are supporting metrics only.

