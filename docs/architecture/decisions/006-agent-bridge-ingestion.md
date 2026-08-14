# ADR 006: Native Agent Bridge Ingestion

## Status

Accepted

## Context

Cortex needs to preserve verified engineering state across coding-agent
sessions without requiring developers to remember a second CLI workflow. MCP
remains the query and explicit-control surface, but agent runtimes expose
native lifecycle hooks and plugins that can report work as it happens.

## Decision

Introduce `AgentBridge` as the single ingestion boundary for runtime events.
Provider adapters normalize native payloads into the shared `AgentEvent`
contract, then the bridge:

1. claims `(provider, session, event)` for idempotency;
2. resolves or starts the repository-scoped task and attempt;
3. records evidence in `ContinuityStore`;
4. creates a handoff at idle, compaction, or session end; and
5. redacts sensitive values before persistence.

The first native integrations are Codex hooks and an OpenCode project plugin.
The adapter boundary also accepts Claude, Cursor, and Gemini payload shapes so
those integrations can be added without changing the continuity core.

The bridge stores summaries, paths, commands, statuses, and verification
signals—not full transcripts or raw file contents. Existing MCP tools remain
the canonical read and explicit-write API.

## Consequences

- Users can install integrations once per repository with `cortex install --project .`.
- Replayed hook deliveries do not create duplicate evidence.
- A session handoff is generated even when the user does not remember to call
  `cortex handoff`.
- The local SQLite store is the deployment boundary for the first cut; a
  hosted ingestion service can be added later without changing provider
  adapters or the event contract.
- Hook configuration is best-effort and preserves existing entries.

## Verification

The contract is covered by focused core and adapter tests. A CLI smoke test can
exercise the full path with `CORTEX_CONTINUITY_DB` pointing at a disposable
local database.
