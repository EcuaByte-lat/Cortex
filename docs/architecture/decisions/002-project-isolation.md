# Architecture Decision Record: Project Isolation via Context Detection

**Status:** Accepted

**Date:** December 2025

**Decision Makers:** Cortex Team

## Context

Users work on multiple projects simultaneously, and memories from different projects should not mix. We need a system to automatically detect which project a user is working in and isolate memories accordingly.

Without isolation:
- Memories from Project A appear when searching in Project B
- Difficult to maintain separate contexts
- Confusion when AI assistant uses wrong project's context
- No way to view/manage memories per project

## Decision

Implement **automatic project detection** using a multi-strategy approach that generates a stable project ID hash based on project context.

## Options Considered

### 1. Automatic Context Detection (Chosen)
**Pros:**
- ✅ Zero configuration - works automatically
- ✅ Uses git repo root (most reliable)
- ✅ Falls back to package.json
- ✅ Stable project IDs across sessions
- ✅ Works with monorepos
- ✅ Cross-platform

**Cons:**
- ❌ Complex to implement
- ❌ May need cache for performance

### 2. Manual Project ID
**Pros:**
- ✅ Simple implementation
- ✅ Full user control

**Cons:**
- ❌ Requires configuration
- ❌ Easy to forget to set
- ❌ Poor UX

### 3. Directory Path Only
**Pros:**
- ✅ Simple to implement

**Cons:**
- ❌ Breaks if project moves
- ❌ Different across team members
- ❌ Not stable

### 4. Global Storage Only
**Pros:**
- ✅ Simplest - no isolation

**Cons:**
- ❌ All memories mixed together
- ❌ Poor search results
- ❌ Can't manage per-project
- ❌ Doesn't scale

### 5. Database per Project
**Pros:**
- ✅ Complete isolation
- ✅ Easy to backup per-project

**Cons:**
- ❌ Multiple database files to manage
- ❌ Can't query across projects
- ❌ Complex configuration

## Rationale

Automatic context detection with a multi-strategy approach provides:

1. **Best UX** - Works automatically, no configuration needed
2. **Reliability** - Git repo is stable and consistent
3. **Flexibility** - Multiple fallback strategies
4. **Team Friendly** - Same project ID for all team members (via git)
5. **Monorepo Support** - Can detect sub-packages
6. **Performance** - Caching prevents repeated detection
7. **Single Database** - Simpler management, can query across projects if needed

## Implementation Details

### Detection Strategies (in order)

1. **Git Repository Root** (Preferred)
   ```typescript
   // Find .git directory, use repo root path
   const gitRoot = findGitRoot(process.cwd());
   return hash(gitRoot);
   ```
   - ✅ Most reliable
   - ✅ Same for all team members
   - ✅ Stable across renames

2. **package.json Location**
   ```typescript
   // Use package name + path
   const pkg = findPackageJson(process.cwd());
   return hash(`${pkg.name}:${pkg.path}`);
   ```
   - ✅ Good for non-git projects
   - ✅ Works with monorepos

3. **Directory Path** (Fallback)
   ```typescript
   // Use absolute directory path
   return hash(resolve(process.cwd()));
   ```
   - ⚠️ Not ideal (breaks on move)
   - ✅ Always works

### Hash Generation

```typescript
// 16-character SHA-256 hash
function hashPath(path: string): string {
  return createHash('sha256')
    .update(path.toLowerCase().replace(/\\/g, '/'))
    .digest('hex')
    .substring(0, 16);
}
```

### Database Schema

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY,
  project_id TEXT,  -- The project hash
  content TEXT,
  -- ... other fields
);

CREATE INDEX idx_memories_project_id ON memories(project_id);
```

### API Design

```typescript
// Automatic (default)
const store = new MemoryStore();
store.add({ content: '...' }); // Auto-detects project

// Manual override
const store = new MemoryStore({ projectId: 'custom-id' });

// Global mode (all projects)
const store = new MemoryStore({ globalMode: true });
```

## Consequences

### Positive
- ✅ **Zero Configuration** - Works out of the box
- ✅ **Consistent** - Same project ID across team members (via git)
- ✅ **Flexible** - Multiple detection strategies
- ✅ **Performance** - Cached for efficiency
- ✅ **Scalable** - Can handle many projects
- ✅ **Backwards Compatible** - Old memories can be migrated

### Negative
- ⚠️ **Complexity** - More code to maintain
- ⚠️ **Edge Cases** - Rare scenarios might need manual override
- ⚠️ **Testing** - Need to test all detection strategies

### Neutral
- Project ID is a hash (not human-readable, but stable)
- Requires filesystem access for detection

## Use Cases

### Individual Developer
```bash
cd ~/projects/my-app
cortex add -c "Using React" -t "fact" -s "setup"

cd ~/projects/other-app  
cortex list  # Only shows other-app memories
```

### Team Development
```bash
# Developer A
cd ~/code/team-project  # Git repo
cortex add -c "Using PostgreSQL" -t "fact" -s "setup"

# Developer B (same team)
cd ~/workspace/team-project  # Same git repo
cortex list  # Sees same project memories!
```

### Monorepo
```bash
cd ~/monorepo/packages/web
cortex add -c "Next.js app" -t "fact" -s "package"

cd ~/monorepo/packages/api
cortex add -c "Fastify API" -t "fact" -s "package"

# Different packages = different project IDs
```

## Future Enhancements

- **Manual Override UI** - Allow users to manually group projects
- **Project Aliases** - Human-readable names for projects
- **Cross-Project Search** - Option to search all projects
- **Project Stats** - Show memory count per project
- **Project Export** - Export memories for specific project

## Migration Strategy

For existing installations:
```typescript
// One-time migration
db.run(`
  UPDATE memories 
  SET project_id = ? 
  WHERE project_id IS NULL
`, [detectProjectId()]);
```

## Testing

```typescript
describe('ProjectContext', () => {
  it('detects git repo root', () => {
    const id = ProjectContext.getProjectId('/path/to/repo');
    expect(id).toMatch(/^[a-f0-9]{16}$/);
  });
  
  it('is consistent across calls', () => {
    const id1 = ProjectContext.getProjectId('/same/path');
    const id2 = ProjectContext.getProjectId('/same/path');
    expect(id1).toBe(id2);
  });
});
```

## References

- [Git Repository Detection](https://git-scm.com/docs/gitrepository-layout)
- [Node.js package.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Monorepo Best Practices](https://monorepo.tools/)

## Status

**Accepted** - Implemented in `@cortex/core` via `context.ts` and `storage.ts`.

## Review Date

Revisit if:
- Users report incorrect project detection
- Need to support non-filesystem contexts (e.g., cloud workspaces)
- Team collaboration features require different approach
