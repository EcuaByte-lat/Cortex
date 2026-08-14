# Cortex Architecture Specification

**Version**: 1.0-draft  
**Status**: Legacy context draft; not the current handoff contract
**Date**: January 2026

> The current product contract is [HANDOFF_CONTRACT.md](./HANDOFF_CONTRACT.md). This document remains as a compatibility reference for the existing `ctx/*` primitives and must not be used to claim that the planned handoff lifecycle is implemented.

---

## Abstract

Cortex defines an open, local-first platform for evidence-backed engineering state. It specifies how humans and coding agents capture, retrieve, verify, and hand off project state across sessions, tools, repositories, and organizations.

## 1. Introduction

### 1.1 Problem Statement

Current AI systems lack a standardized mechanism for:
- Persisting context beyond a single session
- Resuming work between different coding agents without repeating investigation
- Protecting sensitive information in context
- Routing relevant context to the right task

### 1.2 Goals

1. **Interoperability**: Work with any AI model or framework
2. **Privacy**: User-owned, local-first by default
3. **Simplicity**: Small set of composable primitives
4. **Extensibility**: Support future capabilities without breaking changes

### 1.3 Product boundary and relationship to MCP

The Model Context Protocol (MCP) standardizes how AI connects to **tools**.  
Cortex standardizes how AI manages **context**.

```
MCP: "How AI DOES things"
Cortex: "Which project state the next agent can trust"
```

Cortex is not a replacement for Git, CI, issue trackers, observability, A2A, or MCP registries. Those systems remain authoritative for their own domains. Cortex links their evidence into a portable task and handoff record.

---

## 2. Core Concepts

### 2.1 ContextBlock

The fundamental unit of context in Cortex.

```typescript
interface ContextBlock {
  // Identity
  id: string;              // UUID v4
  version: number;         // For conflict resolution
  
  // Content
  content: string;         // The actual context
  contentHash: string;     // SHA-256 for integrity
  
  // Classification
  type: ContextType;       // See §2.2
  scope: ContextScope;     // See §2.3
  visibility: Visibility;  // private | shared | public
  
  // Metadata
  tags: string[];
  source: string;          // Origin identifier
  
  // Temporal
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
  expiresAt?: string;      // Optional TTL
  
  // Semantic (optional)
  embedding?: number[];    // Vector representation
}
```

### 2.2 Context Types

| Type | Description |
|------|-------------|
| `fact` | Objective information about the project |
| `decision` | Architectural or design choices made |
| `pattern` | Recurring patterns or conventions |
| `constraint` | Limitations or requirements |
| `preference` | User preferences |
| `state` | Temporary stateful information |

### 2.3 Context Scopes

| Scope | Lifetime | Visibility Default |
|-------|----------|-------------------|
| `session` | Current conversation | private |
| `project` | Project lifetime | private |
| `user` | User lifetime | private |
| `team` | Team lifetime | shared |
| `org` | Organization lifetime | shared |
| `global` | Indefinite | public |

---

## 3. Primitives

### 3.1 ctx/store

Store a ContextBlock.

**Signature:**
```typescript
store(block: Partial<ContextBlock>): Promise<string>
```

**Required Fields:**
- `content`: The context to store
- `type`: The context type

**Returns:** The `id` of the stored block.

**Example:**
```typescript
const id = await cortex.store({
  content: "We use PostgreSQL with Prisma ORM",
  type: "decision",
  tags: ["database", "orm"]
});
```

### 3.2 ctx/get

Retrieve ContextBlocks.

**Signature:**
```typescript
get(id: string): Promise<ContextBlock | null>
get(query: Query): Promise<ContextBlock[]>
```

**Query Options:**
- `type`: Filter by type
- `tags`: Filter by tags (AND)
- `scope`: Filter by scope
- `search`: Full-text search
- `limit`: Maximum results
- `offset`: Pagination offset

### 3.3 ctx/route

Intelligently select relevant context for a task.

**Signature:**
```typescript
route(task: string, options?: RouteOptions): Promise<ContextBlock[]>
```

**Options:**
- `limit`: Maximum blocks to return (default: 10)
- `types`: Filter by types
- `maxTokens`: Token budget

**Routing Algorithm:**
1. Parse task for semantic intent
2. Match against stored embeddings
3. Apply type and scope filters
4. Rank by relevance score
5. Respect token budget

### 3.4 ctx/guard

Filter sensitive information from context.

**Signature:**
```typescript
guard(content: string, rules?: GuardRules): Promise<GuardResult>
```

**Default Rules:**
- API keys (Bearer tokens, AWS keys, etc.)
- Secrets (passwords, private keys)
- PII (emails, phone numbers, SSN)
- Credentials (usernames with passwords)

**Result:**
```typescript
interface GuardResult {
  content: string;        // Sanitized content
  redacted: Redaction[];  // What was removed
  safe: boolean;          // True if nothing redacted
}
```

### 3.5 ctx/fuse

Combine multiple context sources.

**Signature:**
```typescript
fuse(sources: ContextSource[]): Promise<FusedContext>
```

**Source Types:**
- `memory`: Query stored ContextBlocks
- `file`: Read from file path
- `url`: Fetch from URL
- `inline`: Inline content

**Operations:**
- Deduplication
- Priority weighting
- Token budget respect

---

## 4. Transport

### 4.1 MCP Integration

Cortex implementations SHOULD provide an MCP server.

**Required Tools:**
| Tool | Maps To |
|------|---------|
| `cortex_store` | ctx/store |
| `cortex_search` | ctx/get |
| `cortex_context` | ctx/route |
| `cortex_guard` | ctx/guard |

### 4.2 HTTP API (Optional)

Implementations MAY provide an HTTP/REST API:

```
POST   /context         # ctx/store
GET    /context/:id     # ctx/get by ID
GET    /context         # ctx/get with query
POST   /context/route   # ctx/route
POST   /context/guard   # ctx/guard
POST   /context/fuse    # ctx/fuse
```

---

## 5. Storage

### 5.1 Requirements

Compliant implementations MUST:
- Support local SQLite storage
- Implement full-text search
- Support project isolation via `projectId`

Implementations SHOULD:
- Support vector embeddings for semantic search
- Support encryption at rest

### 5.2 Project Isolation

Context MUST be isolated by project:

```typescript
projectId = hash(absolutePathToProjectRoot)
```

---

## 6. Security

### 6.1 Encryption

Implementations SHOULD support:
- Encryption at rest (AES-256-GCM recommended)
- Encryption in transit (TLS 1.3)
- Optional user-provided encryption keys

### 6.2 Guard Rules

Default guard patterns:

```typescript
const DEFAULT_PATTERNS = {
  apiKey: /(?:api[_-]?key|bearer|token)["\s:=]+["']?[\w\-]{20,}/gi,
  awsKey: /AKIA[0-9A-Z]{16}/g,
  privateKey: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
  email: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,
  // ... more patterns
};
```

---

## 7. Conformance

### 7.1 Levels

| Level | Requirements |
|-------|--------------|
| **Core** | ctx/store, ctx/get, local storage |
| **Routing** | Core + ctx/route |
| **Privacy** | Routing + ctx/guard |
| **Full** | Privacy + ctx/fuse + embeddings |

### 7.2 Compliance Checklist

A compliant implementation MUST:
- [ ] Implement ctx/store and ctx/get
- [ ] Support SQLite storage backend
- [ ] Implement project isolation
- [ ] Support the ContextBlock schema

SHOULD:
- [ ] Provide MCP server
- [ ] Implement ctx/route
- [ ] Implement ctx/guard
- [ ] Support embeddings

---

## 8. Future Extensions

The following primitives are reserved for future specification:

| Primitive | Purpose |
|-----------|---------|
| `ctx/sync` | Multi-device synchronization |
| `ctx/federate` | Cross-organization sharing |
| `ctx/attest` | Cryptographic verification |
| `ctx/expire` | Lifecycle management |
| `ctx/observe` | Change notifications |

---

## Appendix A: Reference Implementation

The reference implementation is available at:  
https://github.com/EcuaByte-lat/Cortex

---

## Appendix B: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0-draft | Jan 2026 | Initial draft |

---

*Cortex Specification v1.0-draft*
