# Cortex Compatibility Primitives

This directory contains the legacy `ctx/*` compatibility primitives. They are
still supported by the core package, but they are not the main product model.
For new work, use the [handoff contract](../HANDOFF_CONTRACT.md) and the
continuity lifecycle.

## Core Primitives

| Primitive | File | Description |
|-----------|------|-------------|
| ctx/store | [store.md](./store.md) | Persist context |
| ctx/get | [get.md](./get.md) | Retrieve context |
| ctx/route | [route.md](./route.md) | Intelligent routing |
| ctx/guard | [guard.md](./guard.md) | Privacy filtering |
| ctx/fuse | [fuse.md](./fuse.md) | Combine sources |

The continuity layer composes these primitives into project-scoped tasks,
attempts, evidence, artifacts, verification, and handoffs.

## Future Primitives (Reserved)

| Primitive | Purpose | Status |
|-----------|---------|--------|
| ctx/sync | Multi-device sync | Planned |
| ctx/federate | Cross-org sharing | Planned |
| ctx/attest | Verification | Planned |
| ctx/expire | Lifecycle | Planned |
| ctx/observe | Notifications | Planned |
