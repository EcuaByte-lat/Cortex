# ADR 008: Lifecycle-first automation and one continuity spine

**Status:** Accepted  
**Date:** 2026-08-25

## Context

Coding-agent vendors now provide different combinations of sessions, hooks,
skills, plugins, subagents, remote execution, and MCP. No single surface is a
portable source of engineering truth. Cortex already has a local continuity
store and an agent bridge, but installation and documentation previously mixed
generic memory, provider hooks, and task state.

## Decision

1. `ContinuityStore` is the canonical product state. The legacy memory store is
   a compatibility projection and may be queried independently.
2. Provider adapters normalize lifecycle events into one event envelope. Unknown
   provider fields are tolerated and sensitive values are redacted before
   persistence.
3. Hooks and plugins capture high-signal lifecycle events. They are telemetry
   and context surfaces, not a second database.
4. Git, CI, PRs, and issue systems remain authoritative for their own evidence.
5. MCP exposes query and action tools. MCP session identity must not be treated
   as engineering task identity.
6. Capture is fail-open by default. A failed hook cannot block an agent, commit,
   push, or review workflow.
7. Codex is integrated through its supported MCP registration and project
   instructions. Cortex must not write undocumented Codex lifecycle files.
8. Git hooks are installed in `.cortex/hooks` and activated through the local
   `core.hooksPath` setting. They capture commit, checkout, merge, and push
   evidence without replacing existing global hooks.

## Consequences

### Positive

- The product survives provider changes and native feature absorption.
- Local-first use remains useful without a hosted account.
- The extension, CLI, MCP server, hooks, and CI all consume one record.
- Open-source users can inspect, export, disable, or remove automation.

### Trade-offs

- Provider support is uneven and requires adapters plus fallback behavior.
- Full transcript reconstruction is intentionally out of scope by default.
- Verification is harder than capture and must be earned from Git, CI, tools,
  or human approval.
- Local Git hook installation changes repository-local Git configuration.

## Safety boundaries

- Generated hooks use `|| true` or equivalent fail-open behavior.
- No generated configuration includes credentials, source contents, or full
  prompts by default.
- Existing editor configuration is merged rather than replaced.
- `cortex uninstall` must eventually remove only Cortex-owned entries and restore
  the previous local Git hooks path when one was recorded.
