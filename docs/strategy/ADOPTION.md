# Cortex Adoption and Compounding Strategy

**Status:** Working operating model
**Updated:** 2026-08-25
**Scope:** How Cortex becomes increasingly useful and difficult to remove without relying on proprietary lock-in.

## Adoption thesis

Cortex becomes necessary by becoming the shortest trustworthy path between an unfinished engineering task and its next verified step. It should earn adoption through useful artifacts, not through a forced account or a claim that agents need another memory database.

The progression is:

```text
portable artifact -> repeated workflow -> shared project record -> team policy -> operational dependency
```

## The compounding loops

### 1. Artifact loop

Every useful session produces a small, reviewable handoff packet that can be committed, attached to a PR, or pasted into an issue. The artifact advertises Cortex to the next person or agent without requiring a sales conversation.

Required properties:

- human-readable Markdown and machine-readable JSON;
- repository, branch, commit, task, and timestamp;
- files changed, commands run, tests, decisions, blockers, and next steps;
- links or hashes for evidence;
- explicit freshness and verification status.

### 2. Continuation loop

The next agent consumes the packet and reports whether it was sufficient. Cortex records the outcome: resumed, repeated, contradicted, stale, or rejected. This turns usage into measurable product improvement.

### 3. Integration loop

Git, CI, pull requests, and issue systems contribute high-signal evidence. The more verified engineering events a project has, the more accurate and useful its future handoffs become.

### 4. Team loop

One developer can start locally. A teammate, reviewer, or background agent benefits from the same artifact. Team adoption begins when the handoff is easier to consume than a chat transcript or a long issue comment.

### 5. Trust loop

Provenance, authority, freshness, conflict detection, and local-first controls reduce the risk of using more agents. This is the path from developer utility to platform/security budget.

### 6. Benchmark loop

Public benchmark repositories compare Cortex against no memory, Markdown instructions, and generic memory. Every improvement becomes a technical article, release note, example, and search asset.

## Legitimate switching costs

Cortex must not create lock-in by hiding user data. Its defensibility should come from accumulated value that remains portable:

- a verified history of project decisions and evidence;
- normalized links between tasks, commits, tests, artifacts, and handoffs;
- organization-specific policies and review rules;
- reliable integrations and migration/export quality;
- benchmark data showing reduced repetition and safer continuation.

Users must be able to export the project record and inspect why a context item was included.

## Activation definition

A project is activated when all of these occur:

1. Cortex is installed or configured.
2. A task is captured with repository and branch identity.
3. One handoff packet is generated.
4. A different session, human, or agent consumes it.
5. The continuation reaches a verified milestone: test, commit, review, or explicit task state change.

The first activation should be possible in under ten minutes on a public or local repository.

## Retention definitions

- **Project W1:** at least one verified continuation in the first seven days.
- **Project W4:** at least two verified continuations in week four.
- **Team activation:** two distinct actors consume or produce handoffs in the same project.
- **Governance activation:** a team enables an evidence, freshness, policy, or audit rule.

The primary retention metric is verified continuations per active project per week. A secondary metric is the percentage of handoffs accepted without manual reconstruction.

## Distribution-to-value map

| Channel | First value | Compounding effect | Leading metric |
|---|---|---|---|
| GitHub Action | PR/commit evidence and handoff artifact | Artifact is visible to reviewers and agents | Handoffs attached to real PRs |
| MCP Registry / Glama / Smithery | One-click discovery and configuration | More clients can consume the same project record | Install-to-first-handoff rate |
| npm/Bun/CLI | Fast local setup | Scripts and CI can automate capture | Activated projects per package install |
| VS Code/Open VSX/JetBrains | Resume action inside the editor | Agent/editor switching becomes habitual | Weekly resumed tasks per extension user |
| Devcontainer/Docker | Team-wide reproducible setup | New contributors inherit the workflow | Activated repositories using the template |
| GitHub App/Marketplace | Repository-native checks and comments | Handoffs become part of review process | Weekly repositories with 2+ handoffs |
| Content/benchmarks | Searchable proof of reduced repetition | Technical credibility and inbound users | Qualified installs from benchmark pages |
| Partners/consultancies | Deployment and workflow design | One partner can activate many teams | Activated teams per partner |
| Cloud marketplaces | Procurement and private offers | Converts technical adoption into enterprise buying | Paid workspaces and renewal rate |

## Pricing progression

The free layer should include the local record, CLI, MCP server, exports, and a useful handoff. Paid value begins when a team needs coordination or control:

- Team: shared sync, workspace membership, retention, basic analytics, and GitHub/GitLab integration.
- Enterprise: SSO/RBAC, audit export, data residency, BYOC/self-hosted, policy enforcement, support, and procurement.

Do not charge first for raw memory volume, SQLite, generic vector search, or MCP connectivity. Price against reduced coordination risk and verified continuation.

## Product gates

Do not expand to broad integrations or hosted infrastructure until the previous gate is met:

1. **Utility:** 80% of benchmark handoffs contain enough information to continue.
2. **Outcome:** median resumption time improves by at least 25% versus the best baseline.
3. **Repeatability:** at least 60% of activated projects produce a second handoff within four weeks.
4. **Team value:** at least 40% of active projects have a second actor consume a handoff.
5. **Payment:** at least three teams pay for shared or governed functionality.

## Anti-patterns

- Capturing complete conversations by default.
- Treating an agent summary as equivalent to a test, commit, or human approval.
- Adding integrations because they look impressive without improving a handoff event.
- Measuring downloads while ignoring second-session continuation.
- Making export or deletion difficult to increase retention.
- Requiring interviews before running public-repository benchmarks and self-serve pilots.
