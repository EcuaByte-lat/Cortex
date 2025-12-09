# Architecture Decision Record: Monorepo Structure with Bun Workspaces

**Status:** Accepted

**Date:** December 2025

**Decision Makers:** Cortex Team

## Context

Cortex consists of multiple related packages:
- Core storage layer (used by all other packages)
- CLI tool for command-line usage
- MCP server for AI tool integration
- VS Code extension for visual interface

We need to decide on project structure that enables:
- Code sharing between packages
- Independent versioning
- Efficient development workflow
- Simple build process
- Easy publishing

## Decision

Use a **monorepo** structure with **Bun Workspaces** for package management.

## Options Considered

### 1. Monorepo with Bun Workspaces (Chosen)
**Pros:**
- ✅ Fast installs (Bun is 50x faster than npm)
- ✅ Native TypeScript support
- ✅ Simple workspace configuration
- ✅ Built-in build tool
- ✅ Shared dependencies
- ✅ Atomic commits across packages
- ✅ Easier to maintain consistency

**Cons:**
- ❌ Bun is relatively new (but stable)
- ❌ Some tools may not support Bun yet

### 2. Separate Repositories
**Pros:**
- ✅ Complete independence
- ✅ Separate versioning

**Cons:**
- ❌ Difficult to share code
- ❌ Harder to maintain consistency
- ❌ Complex to make cross-package changes
- ❌ Dependency versioning issues
- ❌ More overhead to manage

### 3. Monorepo with npm/pnpm/yarn
**Pros:**
- ✅ More mature ecosystems

**Cons:**
- ❌ Slower than Bun
- ❌ More complex configuration
- ❌ Need separate bundler
- ❌ More dependencies

### 4. Single Package
**Pros:**
- ✅ Simplest structure

**Cons:**
- ❌ Can't version independently
- ❌ Large bundle size for users who only need CLI
- ❌ Harder to maintain separation of concerns

## Rationale

Bun Workspaces monorepo provides the best balance:

1. **Performance** - Bun is extremely fast for installs and builds
2. **Developer Experience** - Simple configuration, native TypeScript
3. **Code Sharing** - Easy to share `@cortex/core` between packages
4. **Consistency** - All packages use same TypeScript version, configs
5. **Atomic Changes** - Can update core + all consumers in one commit
6. **Build Simplicity** - Bun.build() is fast and needs no configuration
7. **Modern Stack** - Aligns with 2025+ best practices

## Implementation Details

### Package Structure

```
cortex/
├── package.json          # Root workspace config
├── bunfig.toml           # Bun configuration
├── tsconfig.json         # Shared TypeScript config
├── build.ts              # Root build script
└── packages/
    ├── core/             # @cortex/core
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    ├── cli/              # @cortex/cli
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    ├── mcp-server/       # @cortex/mcp-server
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    └── vscode-extension/ # cortex-vscode
        ├── package.json
        ├── tsconfig.json
        ├── build.ts
        └── src/
```

### Root package.json

```json
{
  "name": "cortex-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run build.ts",
    "test": "bun test --recursive"
  }
}
```

### Workspace Configuration

```toml
# bunfig.toml
[install]
peer = true
production = false
```

### Build Script

```typescript
// build.ts
// Build packages in dependency order
const packages = ['core', 'cli', 'mcp-server', 'vscode-extension'];

for (const pkg of packages) {
  await buildPackage(pkg);
}
```

## Consequences

### Positive
- ✅ **Fast Development** - Instant rebuilds, hot reload
- ✅ **Simple Dependency Management** - One `bun install` for everything
- ✅ **Consistent Versions** - All packages use same TypeScript, etc.
- ✅ **Easy Refactoring** - Can move code between packages easily
- ✅ **Atomic Releases** - Release multiple packages together
- ✅ **Better Testing** - Can test integration between packages
- ✅ **Single CI/CD** - One pipeline for all packages

### Negative
- ⚠️ **Build Order Matters** - Must build `core` before others
- ⚠️ **All or Nothing** - Installing deps installs for all packages
- ⚠️ **Git History** - Mixed changes from all packages

### Neutral
- Larger repository size (but not significantly)
- Need to understand workspace concepts

## Dependency Management

### Internal Dependencies

```json
// packages/cli/package.json
{
  "dependencies": {
    "@cortex/core": "workspace:*"
  }
}
```

The `workspace:*` protocol links to local packages during development and resolves to proper versions on publish.

### External Dependencies

Shared dependencies go in root `package.json`:
```json
{
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/node": "^22.10.1"
  }
}
```

Package-specific dependencies stay in package `package.json`.

## Build Process

### Development
```bash
# Install all dependencies
bun install

# Build all packages
bun run build

# Development mode (watch)
bun run dev:cli
bun run dev:mcp
```

### Production
```bash
# Build for production
bun run build

# Test
bun test

# Publish (individual packages)
cd packages/core && npm publish
cd packages/cli && npm publish
```

## Versioning Strategy

- **Independent Versioning** - Each package has own version
- **Semantic Versioning** - Follow semver strictly
- **Coordinated Releases** - Can release all together or independently

## Alternative Considered: Turborepo

We considered Turborepo for caching and task orchestration:

**Pros:**
- Advanced caching
- Task dependencies
- Remote caching

**Cons:**
- Additional dependency
- More complexity
- Overkill for 4 packages
- Bun is already fast enough

**Decision:** Keep it simple with Bun's native features. Can add Turborepo later if needed.

## Testing Strategy

```typescript
// Run all tests
bun test

// Test specific package
bun --cwd packages/core test

// Watch mode
bun test --watch
```

All tests run in CI/CD pipeline.

## Documentation

Each package has:
- `README.md` - Package-specific docs
- `package.json` - Metadata and scripts

Root has:
- `README.md` - Project overview
- `docs/` - Comprehensive documentation

## Future Considerations

- **Turborepo** - If we add more packages or need caching
- **Changesets** - For automated versioning and changelogs
- **Nx** - If we need more advanced monorepo features
- **Lerna** - Classic monorepo tool (but less relevant with workspaces)

## References

- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Monorepo.tools](https://monorepo.tools/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

## Status

**Accepted** - Currently implemented and working well.

## Review Date

Revisit if:
- Repository grows beyond 10 packages
- Build times become problematic
- Need advanced caching strategies
- Team grows significantly
