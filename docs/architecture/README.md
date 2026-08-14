# Cortex Documentation

**The verified engineering state plane for coding agents**

---

## Overview

Cortex is an open, local-first platform for capturing, retrieving, and verifying engineering state. It connects the evidence produced by agents, Git, CI, and project workflows into portable handoffs.

```
┌─ AI Applications (Claude, Copilot, Cursor)
├─ Tool Layer (MCP)     ← "How AI DOES things"
├─ Engineering State Layer (Cortex) ← "What project state is trustworthy"
└─ Model Layer (GPT, Claude, Llama)
```

---

## Core Primitives

| Primitive | Description | Documentation |
|-----------|-------------|---------------|
| `ctx/store` | Persist context | [store.md](./primitives/store.md) |
| `ctx/get` | Retrieve context | [get.md](./primitives/get.md) |
| `ctx/route` | Intelligent routing | [route.md](./primitives/route.md) |
| `ctx/guard` | Privacy filtering | [guard.md](./primitives/guard.md) |
| `ctx/fuse` | Combine sources | [fuse.md](./primitives/fuse.md) |

---

## Specification

| Document | Description |
|----------|-------------|
| [SPEC.md](./SPEC.md) | Formal protocol specification v1.0-draft |
| [primitives/](./primitives/) | Detailed primitive documentation |

The `ctx/*` primitives and `SPEC.md` describe the compatibility foundation. The current product domain is defined by [HANDOFF_CONTRACT.md](./HANDOFF_CONTRACT.md): project, task, attempt, evidence, decision, artifact, verification, handoff, and conflict.

---

## Principles

1. **Local-First** — An offline path is first-class; external egress is explicit and configurable
2. **User-Owned** — You own your context, not the platforms
3. **Privacy-by-Design** — `ctx/guard` is a primitive, not a plugin
4. **Interoperable** — MCP-native, portable across tools, and compatible with agent runtimes where tested
5. **Open Standard** — No vendor lock-in, ever

---

## Future Primitives (Reserved)

| Primitive | Purpose | Status |
|-----------|---------|--------|
| `ctx/sync` | Multi-device sync | Planned |
| `ctx/federate` | Cross-org sharing | Planned |
| `ctx/attest` | Verification | Planned |
| `ctx/expire` | Lifecycle | Planned |
| `ctx/observe` | Notifications | Planned |

---

## Implementations

- **Reference Implementation**: [Cortex](https://github.com/EcuaByte-lat/Cortex)
- **CLI**: `@ecuabyte/cortex-cli` (Auto-Installer & Manager)
- **MCP Server**: `@ecuabyte/cortex-mcp-server`
- **VS Code Extension**: [Cortex](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)

---

## Contributing

See the [main CONTRIBUTING.md](../../CONTRIBUTING.md) for how to contribute to the protocol specification.
