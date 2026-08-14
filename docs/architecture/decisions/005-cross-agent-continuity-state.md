# ADR 005: Provider-neutral continuity state

**Status:** Accepted
**Date:** 2026-08-14

## Context

Codex, OpenCode, GitHub Copilot, Claude Code, Cursor, Gemini CLI, Cline, and other coding agents expose different session, memory, hook, and instruction mechanisms. A provider-specific transcript cannot be the canonical handoff because the next agent may not have access to that transcript, may use a different model, or may be running on another machine.

MCP is the common tool boundary, but an MCP session is transport state, not durable task state. Continuation therefore needs explicit task and attempt identifiers plus repository identity and evidence freshness.

## Decision

- Cortex owns a local SQLite continuity record with `task`, `attempt`, `evidence`, and derived `handoff` records.
- Every agent integration uses explicit `taskId` and `attemptId`; provider session IDs are optional metadata only.
- Evidence records retain source, authority, status, observed time, and recorded time. Agent summaries do not become verified merely because they are written to a handoff.
- Handoffs are exported as both structured JSON and provider-neutral Markdown.
- CLI and MCP are the first integration surfaces. Provider SDKs, hooks, plugins, and instruction files are adapters and projections, not separate sources of truth.
- The official MCP TypeScript SDK v1 API remains the production integration while SDK v2 is pre-alpha.

## Consequences

This allows one agent to stop after `capture` or `handoff` and another to use `resume` and `detect` without sharing a vendor session. It also makes stale Git state visible instead of silently merging assumptions. The tradeoff is that integrations must explicitly capture high-signal events; Cortex will not treat complete chat transcripts as reliable engineering state by default.

## Initial lifecycle

```text
cortex start -> cortex capture -> cortex handoff -> cortex resume -> cortex detect -> cortex verify
```

Future adapters may use Codex hooks, OpenCode plugins, Copilot SDK sessions, Claude hooks, or editor rules to automate capture, but they must write to this same record.
