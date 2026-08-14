# Cortex Product Direction

**Status:** Canonical working thesis
**Updated:** 2026-08-14
**Decision:** Reposition Cortex from a generic AI memory layer to a verified engineering state plane.

Distribution and retention are governed separately in [DISTRIBUTION.md](./DISTRIBUTION.md) and [ADOPTION.md](./ADOPTION.md). This document defines the product boundary; it is not a claim that every listed lifecycle command already exists.

## One-sentence thesis

Cortex preserves the trustworthy state of software work so any human or coding agent can continue a task from the latest evidence without repeating work, trusting stale assumptions, or losing why a decision was made.

## The problem we solve

Coding agents can create branches, edit files, run commands, open pull requests, review changes, and hand work to another agent. The durable project state is still scattered across chat transcripts, local sessions, issue comments, Markdown files, Git history, CI logs, and human memory.

The failure is not simply that an agent forgets a fact. The expensive failures are:

- the next agent repeats investigation or breaks an earlier decision;
- a task is resumed from the wrong branch or stale commit;
- a test result is remembered without the command, environment, or commit that produced it;
- two agents make incompatible changes because ownership and intent are unclear;
- a team cannot explain which agent changed what, based on which evidence, and what remains unverified.

## What Cortex is

An open, MCP-native engineering state plane with a local-first project record and optional team synchronization.

The primary object is not a free-form memory. It is an evidence-backed engineering record:

```text
project -> task -> attempt -> evidence -> decision -> artifact -> verification
             |          |          |            |           |
           branch     agent      command      reason      commit/PR
```

Every record should answer:

1. What happened?
2. Who or what produced it?
3. Against which repository, branch, commit, and environment?
4. What evidence supports it?
5. Is it current, superseded, failed, or still unverified?
6. What is the safest next action?

## What Cortex is not

- Not another generic vector database or personal memory assistant.
- Not a replacement for Git, GitHub, CI, issue trackers, or observability systems.
- Not a promise that agents can be trusted without verification.
- Not a new MCP registry or a universal agent runtime.
- Not a requirement that every project use a hosted Cortex account.

MCP remains the access interface. Git, CI, issue trackers, and agent runtimes remain sources of truth for their own domains. Cortex connects those sources into a portable, queryable handoff record.

## Product wedge

Start with one painful, frequent workflow:

> Agent A investigates or implements a task, Agent B resumes it later, and Cortex produces a compact, evidence-linked handoff that lets B continue safely.

The first product must make this measurable:

- `cortex start` creates or resumes a task context;
- `cortex capture` records decisions, commands, files, tests, blockers, and artifacts;
- `cortex handoff` generates a resumable packet for another agent or human;
- `cortex resume` retrieves the packet scoped to the current repository, branch, and commit;
- `cortex verify` marks claims as confirmed, stale, superseded, or failed;
- CI and PR integrations attach verification evidence automatically.

The initial handoff should be useful even when no cloud account exists and should be inspectable as human-readable JSON/Markdown.

## Target users and buying trigger

### Initial user

Developers and technical leads who already run more than one coding agent, or who frequently switch between IDE agents, terminal agents, and GitHub background agents.

### Economic buyer later

Engineering managers, platform teams, and security/AI governance teams responsible for reliable use of agents across repositories.

### Trigger events

- a task is handed from one agent to another;
- a background agent opens a PR for review;
- a developer changes IDE, machine, model, or agent vendor;
- a CI failure requires resuming investigation later;
- a team needs to audit AI-generated changes;
- an organization needs the same project instructions and decisions across agents.

## Product principles

1. **Evidence before memory.** A claim without source, scope, and freshness is a hint, not project truth.
2. **Project state before personal preference.** Repository and task state outrank generic user memory.
3. **Append first, summarize second.** Keep an inspectable event trail; derive handoffs and summaries from it.
4. **Freshness is data.** Every record can become stale, be superseded, or expire.
5. **Authority is explicit.** Human approval, Git state, CI output, tool output, and agent inference are different sources.
6. **Local-first, sync when useful.** A team can start with a local project record and add remote collaboration later.
7. **MCP is the surface, not the moat.** The defensible asset is the verified project history and the workflow built around it.
8. **Small, composable integrations.** Git and CI first; enterprise systems later.

## Canonical record types

The implementation can evolve, but the product vocabulary should stay stable:

| Record | Meaning | Typical source |
|---|---|---|
| `task` | Objective, scope, acceptance criteria, status | Issue, prompt, human |
| `attempt` | A bounded unit of agent or human work | Agent runtime, CLI |
| `decision` | A chosen approach and rejected alternatives | Human, review, agent |
| `evidence` | Command, file, diff, test, log, URL, or observation | Git, CI, tools |
| `artifact` | Commit, patch, PR, report, build, or generated file | Git, CI, agent |
| `handoff` | Resumable state plus next actions | Cortex |
| `verification` | Result that confirms, rejects, or qualifies a claim | CI, review, human |
| `conflict` | Competing claims or incompatible changes | Cortex |

## Defensibility

The moat is cumulative workflow data and trust, not embeddings:

- a portable history of project decisions and evidence;
- reliable linkage between agent actions and Git/CI artifacts;
- conflict and supersession handling;
- high-quality handoffs that become the default way work moves between agents;
- organization-level policies, audit trails, and retention controls;
- benchmarks that show fewer repeated tasks, safer resumption, and better verification.

Do not pursue a broad knowledge graph before proving that a handoff improves continuation outcomes.

## Business model hypothesis

### Free/open-source wedge

- Local CLI, MCP server, project record, human-readable export.
- Public repositories and individual developers.
- No required hosted account.

### Paid team layer

- Remote synchronization and shared workspaces.
- Access control, SSO, retention, audit export, policy checks.
- PR/CI dashboards and organization-wide analytics.
- BYOC or self-hosted deployment.

### Enterprise layer

- Private networking, regional data residency, procurement support.
- GitHub/GitLab/Bitbucket, Jira/Linear/Slack/Teams, and CI integrations.
- Evidence retention, legal hold, compliance exports, and support.

Do not charge first for SQLite, generic search, or an MCP endpoint. Charge when Cortex reduces coordination and governance risk across a team.

## Validation without interviews

The current validation policy is evidence-based and self-serve; interviews are not a dependency.

Use public repositories and scripted agent tasks to compare:

- no Cortex;
- Markdown/AGENTS.md only;
- generic memory service;
- Cortex handoff and verification.

Measure:

- continuation success after a handoff;
- time and tokens to resume;
- repeated files, commands, and investigations;
- stale-context and contradictory-decision rate;
- percentage of claims with usable evidence;
- latency and retrieval precision;
- activation, weekly retained projects, handoffs per project, and paid conversion.

## Strategic boundary

The market already contains shared-memory products such as [Mem0](https://docs.mem0.ai/platform/mem0-mcp), [Supermemory](https://supermemory.ai/mcp/), and [SharedMemory](https://docs.sharedmemory.ai/connectors/overview/). Cortex should therefore win through engineering-specific state, provenance, task continuity, and verification—not through the generic promise of “memory for every AI.”
