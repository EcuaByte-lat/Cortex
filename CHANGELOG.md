# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo setup with Bun workspaces
- `@cortex/core` package with SQLite storage
- `@cortex/cli` command-line interface
- `@cortex/mcp-server` for AI tool integration
- VS Code extension with TreeView and Webview
- Project isolation system via context detection
- Comprehensive test suite using Bun's native test runner
- Support for 5 memory types: fact, decision, code, config, note
- Full-text search across memories
- MCP integration with Claude Desktop, GitHub Copilot, and Continue.dev

## [0.1.0] - 2025-12-09

### Added
- Project foundation and initial implementation
- Core memory storage with SQLite
- CLI tool for memory management
- MCP server for AI assistant integration
- VS Code extension with visual interface
- Project-based memory isolation
- Basic documentation structure

[Unreleased]: https://github.com/EcuaByte-lat/Cortex/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/EcuaByte-lat/Cortex/releases/tag/v0.1.0
