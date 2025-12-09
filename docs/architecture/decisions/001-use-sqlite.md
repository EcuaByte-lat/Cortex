# Architecture Decision Record: Using SQLite for Storage

**Status:** Accepted

**Date:** December 2025

**Decision Makers:** Cortex Team

## Context

Cortex needs a local storage solution for persisting memories. The solution must:
- Work offline (local-first)
- Be fast and lightweight
- Require zero configuration
- Support full-text search
- Work cross-platform (Windows, macOS, Linux)
- Have good Bun integration

## Decision

Use **SQLite** as the storage layer via Bun's native `bun:sqlite` module.

## Options Considered

### 1. SQLite (Chosen)
**Pros:**
- ✅ Local-first, no server needed
- ✅ Zero configuration
- ✅ Fast (in-memory option available)
- ✅ Full-text search support
- ✅ Native Bun integration (`bun:sqlite`)
- ✅ Single file storage
- ✅ Mature and battle-tested
- ✅ ACID compliant

**Cons:**
- ❌ Not ideal for concurrent writes (not a concern for single-user local storage)
- ❌ Limited to single machine (by design - local-first approach)

### 2. JSON Files
**Pros:**
- ✅ Simple to implement
- ✅ Human-readable
- ✅ Git-friendly

**Cons:**
- ❌ Poor performance with large datasets
- ❌ No indexing
- ❌ No transactions
- ❌ Full file read/write for each operation
- ❌ Concurrency issues

### 3. PostgreSQL / MySQL
**Pros:**
- ✅ Powerful query capabilities
- ✅ Great for multi-user scenarios

**Cons:**
- ❌ Requires server setup
- ❌ Not local-first
- ❌ Overkill for single-user local storage
- ❌ Additional dependencies

### 4. IndexedDB (for browser)
**Pros:**
- ✅ Built into browsers

**Cons:**
- ❌ Browser-only
- ❌ Complex API
- ❌ Doesn't work in Node.js/Bun
- ❌ Not suitable for CLI/MCP server

### 5. LevelDB / RocksDB
**Pros:**
- ✅ Fast key-value store

**Cons:**
- ❌ No SQL interface
- ❌ More complex queries
- ❌ Less mature in Bun ecosystem

## Rationale

SQLite is the perfect fit for Cortex because:

1. **Local-First Philosophy** - Aligns with our goal of local, offline-capable storage
2. **Zero Configuration** - Users don't need to install/configure a database server
3. **Performance** - Fast enough for thousands of memories with proper indexing
4. **Bun Native Integration** - `bun:sqlite` is built-in, no external dependencies
5. **Single File** - Easy to backup/restore (`~/.cortex/memories.db`)
6. **Full-Text Search** - Built-in FTS5 support for memory search
7. **ACID Transactions** - Data integrity guarantees
8. **Cross-Platform** - Works identically on all platforms
9. **Proven Technology** - Used by thousands of applications (Git, Chrome, etc.)

## Implementation Details

```typescript
import { Database } from 'bun:sqlite';

// Simple initialization
const db = new Database('~/.cortex/memories.db');

// Schema with proper indexes
db.run(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run('CREATE INDEX idx_memories_project_id ON memories(project_id)');
```

## Consequences

### Positive
- ✅ Fast development - native Bun API is simple
- ✅ No additional dependencies
- ✅ Easy testing - in-memory SQLite for tests
- ✅ Simple backup/restore - just copy the `.db` file
- ✅ Excellent query performance with indexes
- ✅ Room to grow - can add FTS5 later for advanced search

### Negative
- ⚠️ Cloud sync will need separate implementation (acceptable - can be added later)
- ⚠️ Not designed for concurrent access from multiple processes (acceptable - single-user tool)

### Neutral
- SQLite file format is binary (but that's fine - users don't need to read it directly)
- Migration will be needed if we switch storage (acceptable - this is stable technology)

## Future Considerations

- **Cloud Sync**: Can add cloud backup by syncing the SQLite file
- **Team Features**: Could replicate SQLite to server for team collaboration
- **Advanced Search**: Can enable FTS5 for semantic search
- **Performance**: Can use WAL mode for better write performance
- **Encryption**: Can add SQLCipher for encrypted storage

## References

- [Bun SQLite Documentation](https://bun.sh/docs/api/sqlite)
- [SQLite Use Cases](https://www.sqlite.org/whentouse.html)
- [SQLite for Application Files](https://www.sqlite.org/appfileformat.html)

## Status

**Accepted** - Implemented in `@cortex/core` package.

## Review Date

Revisit if:
- Performance issues emerge with >10,000 memories
- Multi-user/team features are prioritized
- Cloud-first approach becomes requirement
