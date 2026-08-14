# Handoff contract

**Status:** Planned domain contract
**Version:** 0.1 draft
**Updated:** 2026-08-14

This document defines the product contract for a reliable engineering handoff. It is intentionally narrower than a universal memory protocol. The implementation may begin with a projection over the current `Memory` store, but the domain vocabulary must remain stable as storage evolves.

## Required outcome

A handoff must allow another human or coding agent to identify the current task, understand what has been attempted, inspect the supporting evidence, avoid superseded assumptions, and take the next safe action.

## Record types

| Type | Purpose |
|---|---|
| `project` | Repository/workspace identity and scope |
| `task` | Objective, acceptance criteria, and status |
| `attempt` | Bounded work by a human or agent |
| `evidence` | File, diff, command, test, log, URL, or observation |
| `decision` | Chosen approach, alternatives, and rationale |
| `artifact` | Commit, patch, PR, build, report, or generated file |
| `verification` | Confirmation, rejection, qualification, or failure |
| `handoff` | Resumable projection with next actions |
| `conflict` | Competing, incompatible, or superseded claims |

## Minimum handoff fields

```text
id
project
task
attempt
actor
repository
workspace
branch
commit
createdAt
updatedAt
status
summary
decisions[]
filesChanged[]
commands[]
tests[]
blockers[]
artifacts[]
evidence[]
nextActions[]
freshness
```

## Evidence and authority

Every claim should carry:

- `source`: git, ci, tool, file, human, agent, or external URL;
- `authority`: observed, verified, approved, inferred, or unknown;
- `observedAt` and `recordedAt`;
- `scope`: project, repository, branch, commit, task, or session;
- `status`: current, stale, superseded, failed, or unverified;
- relation to the claim, decision, artifact, or verification it supports.

An agent summary is not evidence by itself. A handoff is a derived view and cannot upgrade the authority of its underlying records.

## Freshness and conflicts

New Git state, test results, explicit human decisions, or contradictory evidence may supersede a prior record. Superseded records remain inspectable. The system must prefer current evidence for the active branch and commit, while exposing uncertainty instead of silently merging conflicts.

## Portability and privacy

- Handoffs must export to Markdown and JSON.
- A local-only project must work without a hosted account.
- Export must be sufficient to rebuild search indexes.
- Deletion must remove the record and derived indexes within the declared retention boundary.
- External model or embedding calls must be explicit and observable.
- Complete conversations and secrets must not be captured by default.

## Lifecycle

```text
start -> capture -> handoff -> resume -> verify -> supersede/archive
```

These lifecycle commands are roadmap targets until the corresponding code, fixtures, and integration tests exist.

## Non-goals

- replacing Git, CI, issue trackers, or observability;
- becoming a general personal-memory database;
- defining a new agent-to-agent transport;
- treating vector similarity as verification;
- guaranteeing that an agent is correct without evidence.
