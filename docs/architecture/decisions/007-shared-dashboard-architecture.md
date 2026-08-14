# ADR 007: Shared React dashboard architecture

## Status

Accepted

## Context

The VS Code continuity cockpit currently renders a large inline HTML string and
keeps selection, filtering, rendering, and message handling in one webview
script. That makes local interaction state easy to lose when a new snapshot
arrives and prevents the same dashboard from being reused by a future web
application.

Cortex needs two hosts for the same product surface:

- a VS Code webview that receives local snapshots and sends commands through
  `postMessage`;
- a web application that may later fetch, cache, and subscribe to remote
  project state.

The shared layer must not import VS Code, Astro, browser globals, or a server
client. It must validate untrusted messages at runtime, preserve a single
source of truth for selection and filters, and keep domain contracts separate
from rendering concerns.

## Decision

### 1. Runtime contracts: Zod in `@ecuabyte/cortex-shared`

Add Zod schemas for the dashboard wire protocol and derive TypeScript types
from those schemas where practical. Validate at every host seam with
`safeParse`:

- continuity snapshots received by the UI;
- dashboard commands sent to a host;
- host messages such as hydration, snapshots, status, and errors.

Existing domain interfaces remain source-compatible during migration. The
first schema-first contracts are the dashboard snapshot and message/command
unions; database rows and core storage can migrate incrementally.

### 2. Shared client state: a small framework-neutral store

Do not add Zustand, Redux, XState, or another state library for the first
dashboard extraction. Create a small store factory in a framework-neutral
dashboard package using the platform primitives `subscribe`,
`useSyncExternalStore`, and a pure reducer. The store owns:

- the latest validated snapshot;
- selected task ID and selected event ID;
- timeline filter;
- connection/action status;
- actions such as `selectTask`, `selectEvent`, `setFilter`, `hydrate`, and
  `refresh`.

React consumes the store through a thin local hook built on
`useSyncExternalStore`. The VS Code host and tests can use `getState`,
`dispatch`, and `subscribe` without importing React. A store is created per
dashboard instance; no module-level singleton is allowed.

Snapshot replacement must preserve a selected task/event only when that ID
still exists. Otherwise the store falls back to the snapshot's active task and
the first visible event. This makes selection deterministic across refreshes
and live updates.

### 3. Host seam: a small dashboard transport interface

The shared dashboard receives a host adapter with a small interface:

```ts
interface DashboardTransport {
  send(command: DashboardCommand): void | Promise<void>;
  subscribe(listener: (message: DashboardMessage) => void): () => void;
}
```

The VS Code adapter translates this interface to `acquireVsCodeApi()` and
`postMessage`. The web adapter can translate it to HTTP plus SSE/WebSocket
later. React components never know which host they run in.

### 4. Package seams

Use these packages/modules:

```text
@ecuabyte/cortex-shared
  domain types, Zod schemas, sync protocol, wire messages and commands

@ecuabyte/cortex-dashboard
  framework-neutral store, selectors, React components, CSS tokens and
  accessibility behaviour

vscode-extension
  VS Code transport adapter, webview bootstrap and host actions

web (later)
  Astro pages/layouts and React dashboard island
```

`@ecuabyte/cortex-dashboard` must not depend on VS Code or Astro. Its store
and selectors remain usable in tests and non-React hosts; only its React entry
point imports React.

### 5. Astro is the web shell, not the extension runtime

Astro will own public web pages, layouts, routing, static generation, and
future server integration. The interactive cockpit will be a React island
hydrated by Astro. The VS Code extension will consume the same React UI as a
browser bundle inside its webview.

This preserves reuse without forcing Astro's page/build runtime into a VS Code
webview or coupling the dashboard to server rendering.

### 6. Backend synchronization is a provider-neutral protocol

The current SQLite `ContinuityStore` remains the local implementation. A
future backend must not leak its cloud provider, database, queue, auth vendor,
or agent harness into the shared contract.

Define the sync seam in shared/core around append-only changes and cursors:

```ts
interface SyncTransport {
  push(batch: SyncBatch): Promise<SyncPushResult>;
  pull(input: SyncPullInput): Promise<SyncPullResult>;
}
```

The wire protocol uses JSON validated by Zod and includes:

- `protocolVersion` and schema version;
- globally unique change/event IDs;
- project/workspace scope;
- actor and origin metadata;
- occurred/recorded timestamps;
- an idempotency key;
- an opaque server cursor;
- immutable evidence and handoff payloads;
- explicit conflict or supersession records.

The local implementation will eventually maintain an outbox and inbox/cursor
table. It can push batches while offline and apply remote changes idempotently
when connectivity returns. The backend may use SQLite, Postgres, a hosted
database, or another store behind an adapter; none of those choices appear in
`@ecuabyte/cortex-shared` or the dashboard.

Use HTTP/JSON as the first transport shape because it is portable across
runtimes. Streaming updates can be added later through SSE or WebSocket while
keeping the same `SyncTransport` contract.

Do not use last-write-wins for decisions, verification, or task status when two
actors disagree. Preserve both claims and create a conflict/supersession
record. Evidence capture itself is append-only and can merge safely by ID.

### 7. Server state and client state stay separate without another library

The dashboard store owns only view state and the validated snapshot currently
used by its host. The future web adapter can add TanStack Query only if a
remote API creates real caching/invalidation needs. It must not duplicate the
same snapshot in two independent stores.

Likewise, XState remains an escalation path only if reconnect, refresh,
resume, verification, and conflict resolution become a multi-step workflow
with illegal transitions. Selection and filters remain a pure reducer.

### 8. Tooling and testing

- Add only `zod` to the shared package initially.
- Add `react` and `react-dom` because the reusable dashboard is React-based.
- Keep Bun for the extension and package builds initially; do not add a
  standalone Vite app just for the webview.
- Let Astro use its native Vite pipeline when the web shell is introduced.
- Use Biome for formatting and linting.
- Test Zod contracts, reducer transitions, cursor handling, and in-memory sync
  adapters with the existing Bun test runner.
- Add browser-level tests only when the Astro web shell exists.

## Consequences

Positive:

- one selection/filter implementation for VS Code and web;
- runtime validation at the message boundary instead of trusting `any`;
- a small host seam that can be tested with an in-memory adapter;
- one new runtime validation dependency instead of several state/query tools;
- a sync protocol that can be implemented by different backend providers;
- Astro remains available for SEO and web delivery without owning the cockpit;
- the dashboard can grow into richer workflows without spreading state across
  DOM callbacks and extension handlers.

Tradeoffs:

- React adds client dependencies to the extension bundle;
- the extension needs a browser-targeted dashboard build in addition to the
  Node extension build;
- the initial schema migration must preserve compatibility with existing
  SQLite and MCP consumers;
- a small custom store is code Cortex owns and must keep well tested;
- TanStack Query or XState may be introduced later, but only after their
  respective complexity actually exists.

## Verification

The first implementation milestone must include tests for:

1. selecting a non-active task;
2. preserving that selection after a new snapshot;
3. falling back when the selected task disappears;
4. filtering events within the selected task;
5. routing handoff commands with the selected task ID;
6. rejecting malformed host messages with Zod;
7. rendering source, authority, acceptance criteria, and task-scoped evidence.
