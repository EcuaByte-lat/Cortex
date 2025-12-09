# Contributing to Cortex

First off, thank you for considering contributing to Cortex! It's people like you that make Cortex such a great tool for the AI development community.

## 🌟 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## 🚀 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue tracker](https://github.com/AngelAlexQC/Cortex/issues) to avoid duplicates.

When reporting bugs, include:
- **Clear description** of the issue
- **Steps to reproduce** the behavior
- **Expected vs actual behavior**
- **Environment details** (OS, Bun version, etc.)
- **Screenshots** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When suggesting:
- Use a clear and descriptive title
- Provide detailed description of the proposed feature
- Explain why this enhancement would be useful
- Include examples or mockups if possible

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the development setup** (see below)
3. **Make your changes** following our coding standards
4. **Add tests** if applicable
5. **Update documentation** if needed
6. **Ensure tests pass** (`bun test`)
7. **Create a Pull Request**

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Git
- VS Code (recommended)

### Setup

```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/Cortex.git
cd Cortex

# 2. Install dependencies
bun install

# 3. Build all packages
bun run build

# 4. Run tests
bun test
```

### Project Structure

```
cortex/
├── packages/
│   ├── core/              # Core storage layer
│   ├── cli/               # Command-line interface
│   ├── mcp-server/        # MCP protocol server
│   └── vscode-extension/  # VS Code extension
└── docs/                  # Documentation
```

## 📝 Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer type inference when possible
- Avoid `any` types
- Use meaningful variable names

### Code Style

- Use Prettier defaults (2 spaces, single quotes)
- Follow existing patterns in the codebase
- Keep functions focused and small
- Add JSDoc comments for public APIs

### Example

```typescript
/**
 * Searches memories by content query
 * @param query - Search term
 * @param options - Optional filters
 * @returns Array of matching memories
 */
search(query: string, options?: SearchOptions): Memory[] {
  // Implementation
}
```

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add semantic search capability
fix: resolve project isolation bug
docs: update CLI usage guide
test: add tests for context detection
chore: update dependencies
```

### Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for meaningful test coverage
- Use descriptive test names

```typescript
describe('MemoryStore', () => {
  it('should isolate memories by project', () => {
    // Test implementation
  });
});
```

## 📦 Working with Packages

### Building

```bash
# Build all packages
bun run build

# Build specific package
bun run build:core
bun run build:cli
bun run build:mcp
bun run build:extension
```

### Testing

```bash
# Run all tests
bun test

# Run tests for specific package
bun --cwd packages/core test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Development Mode

```bash
# CLI in watch mode
bun run dev:cli

# MCP server in watch mode
bun run dev:mcp

# VS Code extension
# Press F5 in VS Code to launch Extension Development Host
```

## 🔍 Making Changes

### Adding a New Feature

1. Create an issue describing the feature
2. Wait for discussion/approval
3. Create a feature branch: `git checkout -b feat/your-feature`
4. Implement the feature with tests
5. Update relevant documentation
6. Submit a PR referencing the issue

### Fixing a Bug

1. Create an issue describing the bug (if not exists)
2. Create a bugfix branch: `git checkout -b fix/issue-number`
3. Write a failing test that reproduces the bug
4. Fix the bug
5. Ensure test now passes
6. Submit a PR referencing the issue

### Updating Documentation

Documentation PRs are always welcome! You can:
- Fix typos
- Improve clarity
- Add examples
- Update outdated content

Documentation lives in:
- `README.md` - Project overview
- `docs/` - Detailed documentation
- Package-level READMEs (if needed)

## 🎯 PR Guidelines

### Before Submitting

- [ ] Tests pass locally (`bun test`)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with `main`

### PR Description

Include:
- **What** changed
- **Why** it changed
- **How** to test it
- **Related issues** (if any)

Example:
```markdown
## What
Adds project isolation feature to prevent memory mixing

## Why
Users reported that memories from different projects were appearing in searches

## How to Test
1. Create memories in two different projects
2. Search in each project
3. Verify results are isolated

Fixes #123
```

## 🤝 Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge

## 📚 Resources

- [Project Documentation](./docs/)
- [Architecture Overview](./docs/DEVELOPMENT.md)
- [Vision & Roadmap](./docs/CORTEX_VISION.md)

## ❓ Questions?

Feel free to:
- Open a [discussion](https://github.com/AngelAlexQC/Cortex/discussions)
- Ask in an existing issue
- Reach out to maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Cortex!** 🧠✨
