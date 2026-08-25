# Cortex Dashboard Research

**Date:** 2026-08-25
**Status:** Research complete; continuity cockpit exists, hardening and evidence-first prioritization remain

## Research question

What should the Cortex VS Code dashboard show so it improves continuation of engineering work instead of becoming a decorative analytics canvas?

## Executive conclusion

Cortex should become a local-first **continuity cockpit** for the active engineering task. Its primary job is to make the current state of agent work legible and actionable:

```text
task -> active attempt -> live events -> evidence -> repository state -> next safe action
```

The default view should combine a compact task header, a live activity timeline, an evidence/verification summary, and a contextual inspector. A graph or “AI radar” can be optional later, but it should not be the primary surface. The legacy scan view remains useful for discovery, while the continuity cockpit is the product surface for the active task.

## Repository findings

### Current UI mismatch

`packages/vscode-extension/src/aiScanWebview.ts` remains the legacy scan surface and presents:

- a project-analysis header;
- generic coverage, memory, file, and “guardian” counters;
- a list of project areas;
- a live-looking feed that mostly receives extracted memories;
- a single “Start Analysis” action.

This is useful for a scan demo, but it does not answer the questions a developer has while an agent is working:

- Which task and attempt are active?
- Which agent/model/session is responsible?
- What is the agent doing right now?
- What changed in files, commands, tests, or Git?
- What is observed versus verified?
- Is the current state stale or in conflict?
- Can I safely resume, hand off, verify, or intervene?

### Existing product vocabulary is stronger than the UI

The canonical product direction and handoff contract already define the right objects:

```text
project -> task -> attempt -> evidence -> decision -> artifact -> verification -> handoff
```

The shared event model also already has the beginnings of a live feed:

- `session.started`
- `prompt.submitted`
- `tool.completed`
- `tool.failed`
- `file.changed`
- `command.completed`
- `compaction.started`
- `session.idle`
- `session.ended`

The `AgentBridge` normalizes these events into continuity evidence, and the continuity cockpit consumes that lifecycle. The remaining work is to make the cockpit the default entry point, remove misleading generic counters, and harden freshness, CSP, and DOM-safe rendering.

### Important implementation constraints

- The extension is local-first and must remain useful without a hosted account.
- The continuity database is currently shared through a local SQLite path, while the extension has its own webview state and memory store.
- The existing webview builds a large inline HTML document, loads Phosphor icons from an external CDN, and interpolates memory content into `innerHTML`. A rebuild should use a strict content security policy, local assets, and DOM-safe rendering for workspace/agent data.
- VS Code recommends native views for lists and only using webviews when custom functionality is necessary. A full-width detail view is justified for the timeline plus inspector, but the sidebar should stay compact and native where possible.

## External evidence

### Pattern 1: live execution timeline

Agent observability products converge on an execution trace with nested spans, tool calls, latency, failures, and a selected-step inspector. Honeycomb's Agent Timeline uses swimlanes for multiple agents and marks LLM operations, tool calls, and failures in one chronological view. LangSmith describes traces as the complete sequence from input through model interactions, tool calls, and decision points. AgentOps similarly exposes a time visualization of LLM calls, actions, tools, and errors.

**Implication for Cortex:** show a readable, task-scoped timeline with event type, actor, duration/status, and evidence link. Do not expose raw telemetry by default; summarize each event in engineering language and reveal payload details on selection.

### Pattern 2: sessions and agent state, not only traces

Cursor's Background Agent experience organizes work around sessions that can be monitored, followed up, or taken over. VS Code's Agents window treats sessions as first-class objects, shows active tool calls and elapsed time, and lets users follow delegated subagents. A recent Codex VS Code issue specifically reports that missing real-time subagent activity and lost conversation state makes successful backend work appear invisible to the user.

**Implication for Cortex:** the first navigation object should be the task/attempt, with agent identity, branch, worktree, last activity, and a clear live/idle/blocked/completed state. “Connected” is not enough; the dashboard must show the latest meaningful action.

### Pattern 3: reviewable outcomes

Cursor's review surface makes generated file changes inspectable and selectively acceptable. GitHub Copilot's cloud-agent workflow is organized around research, plan, code changes, pull request, review, and verification.

**Implication for Cortex:** the dashboard must connect activity to outcomes: files changed, commands run, tests, artifacts, blockers, and verification. A task is not “healthy” because the agent is emitting events; it is healthy when its claims are supported by current evidence.

### Pattern 4: IDE-native placement

VS Code's UX guidance recommends keeping the number of views low, using Tree Views for structured lists, keeping custom webviews for functionality that truly needs them, and using the status bar for discreet progress. The guidance also requires themeable UI, accessibility, keyboard support, and a webview CSP.

**Implication for Cortex:** use the Activity Bar/sidebar for the active-task list and compact status; open the full continuity cockpit in an editor or panel only when the user needs the timeline and inspector.

## Options considered

### Option A — Agent control tower (recommended)

Default screen: active task, current agent/attempt, live timeline, evidence health, and next action.

**Strengths:** directly supports the Cortex wedge; useful while work is running and when resuming; maps cleanly to existing domain types.
**Risk:** requires real event ingestion rather than a cosmetic feed.

### Option B — Flight recorder / observability trace

Default screen: waterfall or swimlane of every model/tool/file/command event with deep payload inspection.

**Strengths:** excellent for debugging agent behavior and proving what happened.
**Risk:** can become noisy, framework-specific, and detached from handoff decisions; overlaps with LangSmith, Honeycomb, Datadog, and similar tools.

### Option C — Handoff board

Default screen: tasks grouped by active, blocked, ready to resume, needs verification, and completed.

**Strengths:** useful across multiple agents and sessions; makes continuation the organizing principle.
**Risk:** weak as a live surface while the agent is actively working unless paired with a current-event panel.

### Decision

Use **Option A as the product surface**, borrow the timeline and inspector from Option B, and add a lightweight task/session list from Option C. The resulting hierarchy is:

```text
sidebar: tasks and agent status
main: active task + live timeline
inspector: selected evidence / file / command / verification
handoff action: resume, create handoff, verify, or open artifact
```

## Proposed information architecture

### 1. Workspace / task switcher

- repository name, branch, worktree, commit freshness;
- active task and status;
- attempts grouped by agent/harness;
- filters: active, blocked, needs verification, completed;
- “Open latest handoff” as the primary resume action.

### 2. Active task header

- objective and acceptance criteria;
- actor, model, session, and elapsed time;
- status: working, waiting for input, blocked, stale, completed;
- branch/commit badge with drift warning;
- actions: pause/inspect, create handoff, resume, verify.

### 3. Live activity timeline

Each row is a normalized event, not a raw log line:

- timestamp and duration;
- event kind: prompt, tool, file, command, test, decision, blocker, verification;
- actor/harness;
- plain-language summary;
- status and authority;
- links to file, diff, command output, test, or artifact;
- optional “new since last view” marker.

Group low-level events into meaningful spans so the default view does not become a firehose. Keep a raw-detail disclosure for debugging.

### 4. Evidence health

Show the trust state of the active handoff:

- current verified evidence;
- current observed evidence;
- unverified claims;
- failed tests/commands;
- stale or superseded evidence;
- conflicts requiring a decision.

The key metric is not “memories extracted.” It is **handoff readiness**: whether another agent can continue safely from current evidence.

### 5. Inspector

When an event is selected, show:

- what happened;
- who/what produced it;
- repository, branch, commit, and environment scope;
- source and authority;
- raw details behind a disclosure;
- related task, attempt, decision, artifact, or verification;
- “open in editor,” “open diff,” or “copy evidence” actions.

## Live data architecture recommendation

The current `continuity_events` table claims idempotency but does not retain enough event detail for a rich live UI. The next implementation should add a local, redacted event stream with:

1. normalized event envelope;
2. event identity and deduplication key;
3. task/attempt/session/agent identity;
4. repository branch/commit/worktree;
5. timestamp and status;
6. safe summary plus structured details;
7. relation to generated evidence;
8. a subscription path for the extension.

For a first local implementation, use the existing SQLite continuity database plus a lightweight polling/watch layer in the extension. Keep the boundary abstract so it can later be replaced by an in-process event emitter or local WebSocket without changing the UI contract. The UI should visibly distinguish `live`, `last seen`, and `disconnected`; it must never imply live visibility when it is only showing persisted state.

## What not to build first

- a decorative node graph or animated “AI universe”;
- generic memory/coverage counters;
- token/cost analytics without a user decision attached;
- raw prompt/reasoning dumps as the default view;
- a cloud account or hosted sync requirement;
- a dashboard that claims security or correctness from the absence of errors;
- automatic capture of full conversations or secrets.

## First release success criteria

The redesigned extension should let a developer answer these in under 10 seconds:

1. What task is active?
2. Which agent is working, and what did it do last?
3. What changed in the repository?
4. Which claims are verified, stale, failed, or unresolved?
5. What is the safest next action?

The first measurable product outcome should be improved continuation: fewer repeated investigations, lower time to resume, and a higher percentage of handoff claims backed by usable evidence.

## Sources

- [Cortex Product Direction](./PRODUCT_DIRECTION.md)
- [Cortex Handoff Contract](../architecture/HANDOFF_CONTRACT.md)
- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)
- [VS Code Views UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/views)
- [VS Code Webviews UX Guidelines and security](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code Agents window](https://github.com/microsoft/vscode-docs/blob/main/docs/agents/agents-window.md)
- [GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent)
- [Cursor Background Agents](https://docs.cursor.com/background-agent)
- [LangSmith observability](https://docs.langchain.com/oss/python/langchain/observability)
- [AgentOps observability](https://docs.agentops.ai/v2/introduction)
- [Honeycomb Agent Timeline](https://www.honeycomb.io/platform/agent-timeline)
- [Codex VS Code real-time subagent activity issue](https://github.com/openai/codex/issues/32502)
