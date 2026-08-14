# Changelog

## 0.9.0

### Patch Changes

- [#41](https://github.com/EcuaByte-lat/Cortex/pull/41) [`3a4c84a`](https://github.com/EcuaByte-lat/Cortex/commit/3a4c84a2153234069619aea8fab0a72627d31e97) Thanks [@aquirozdev](https://github.com/aquirozdev)! - Add native coding-agent lifecycle ingestion through the Agent Bridge, including
  Codex hooks, OpenCode plugins, durable deduplication, automatic handoffs, and
  redaction before persistence.

## 0.8.3

### Patch Changes

- [`ddd823d`](https://github.com/EcuaByte-lat/Cortex/commit/ddd823dd03c6aa7ea9ebe139065242f9d5bb5216) Thanks [@aquirozdev](https://github.com/aquirozdev)! - Fix: Implement strict project isolation for memories in VS Code extension (UI now matches MCP Agent view).

## 0.8.2

## 0.8.1

## 0.8.0

### Minor Changes

- [`e4fc7c7`](https://github.com/EcuaByte-lat/Cortex/commit/e4fc7c73d18c6775591e0ad763e8768e29abd8e1) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - Add multi-provider AI support for all major editors

  - Add OpenAI adapter: GPT-5, GPT-5.2, GPT-5 Mini, o3
  - Add Anthropic adapter: Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
  - Add Gemini adapter: Gemini 3 Pro, 2.5 Pro, 2.5 Flash
  - Implement hybrid model selection: native vscode.lm → BYOK fallback
  - Support all VS Code forks: Cursor, Windsurf, Antigravity

## 0.6.2

### Patch Changes

- Fix workspace dependency resolution for npm installation

  - Changed workspace:\* to workspace:^ for proper semver resolution
  - Added custom publish script using bun publish instead of changeset publish
  - bun publish properly resolves workspace: protocol to actual versions

  See: https://github.com/oven-sh/bun/issues/24687

## 0.6.1

### Patch Changes

- Fix VS Code engine version to match @types/vscode requirement (^1.107.0)

## 0.6.0

### Minor Changes

- ## New Features

  - **Gemini Code Assist Support**: Added MCP configuration generator for Google Gemini Code Assist
  - **Auto-Memory Rules**: New automatic memory rules generation for Cursor and Claude Code
  - **Universal Installer**: Complete installer module with support for all major AI coding assistants
  - **Config Generator Improvements**: Standardized `generate-config` command for all editors

  ## Fixes

  - Fixed demo mode in MCP server
  - Standardized configuration generation across all supported editors

  ## Documentation

  - Updated installation instructions for all supported tools
  - Improved README with real features and comprehensive guides
  - Added Gemini Code Assist to supported editors list

## 0.5.13

### Patch Changes

- [`afd8c70`](https://github.com/EcuaByte-lat/Cortex/commit/afd8c701c86e0b919d0a28ec83097d87f8763fab) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: improved error messages when no AI models are detected during scan

- [`c8ab0c1`](https://github.com/EcuaByte-lat/Cortex/commit/c8ab0c1db47d04705a6fe01626c80a6864c0b014) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: update engine requirement to ^1.93.0 to support native Language Model API

## 0.5.12

### Patch Changes

- [`724b554`](https://github.com/EcuaByte-lat/Cortex/commit/724b5542c8d50629ac940a89d4cf570e8b774f99) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - feat: re-trigger release to validate OpenVSX publishing token

## 0.5.11

### Patch Changes

- [`da1af97`](https://github.com/EcuaByte-lat/Cortex/commit/da1af97d39e4d78370b6540c8968fb9acc8b9b9d) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - chore: enable OpenVSX publishing for native editor support

## 0.5.10

### Patch Changes

- [`8c92d4d`](https://github.com/EcuaByte-lat/Cortex/commit/8c92d4d75df67ef7a14fface1626dbb17b8654dc) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: update vsce publish command to skip dependency check for Bun monorepo compatibility

## 0.5.9

### Patch Changes

- [`4c54847`](https://github.com/EcuaByte-lat/Cortex/commit/4c548472f6f30939358888e6f1ce5d8776f4cf18) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: remove .vscodeignore to allow using files whitelist for clean VSIX packaging

## 0.5.8

### Patch Changes

- [`9083765`](https://github.com/EcuaByte-lat/Cortex/commit/9083765151f5bf29f3f429a07ea810664e02b4f0) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: whitelist VSIX files to prevent symlink traversal error in VS Code extension packaging

## 0.5.7

### Patch Changes

- [`1949f1b`](https://github.com/EcuaByte-lat/Cortex/commit/1949f1b87d5089f91c0b20ff551e820cd3ae1775) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: resolve all lint warnings and upgrade biome config
  codestyle: fix non-null assertions and string concatenation

## 0.5.6

### Patch Changes

- cc4ed85: fix: rename packages to @ecuabyte scope and setup changesets coverage

All notable changes to the Cortex Memory extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-12-29

### Added

- **Interactive Walkthrough** - 4-step onboarding guide for new users
- **Keyboard Shortcuts**
  - `Ctrl+Shift+M` / `Cmd+Shift+M` - Add new memory
  - `Ctrl+Shift+Alt+M` / `Cmd+Shift+Alt+M` - Search memories
  - `Ctrl+Shift+S` / `Cmd+Shift+S` - Save selection as memory
- **Context Menu Integration** - Right-click selected text to save as memory
- **Save Selection as Memory** - New command to capture code directly from editor
- **Welcome Views** - Helpful empty states for Memory and Tools trees

### Changed

- **Activity Bar Icon** - New monochrome SVG icon for proper VS Code theme integration
- **Memory Tree Icons** - Type-specific colored icons (💡 fact, ✅ decision, 💻 code, ⚙️ config, 📝 note)
- **Status Bar** - Now shows memory count with brain icon, warning background when paused
- **Memory Webview** - Complete redesign with modern card layout, gradients, and copy-to-clipboard

### Fixed

- Activity Bar icon now renders correctly instead of white square
- Status bar updates memory count automatically every 30 seconds

## [0.2.2] - 2024-12-12

### Added

- Official branding assets and icons
- Improved extension icon for VS Code Marketplace

### Fixed

- Extension packaging now includes icon.png correctly

## [0.2.1] - 2024-12-12

### Changed

- Updated repository URLs to new organization
- Bumped version for branding update

## [0.2.0] - 2024-12-09

### Added

- Memory Tree View in Activity Bar sidebar
- Add Memory command with type selection
- Search Memories functionality
- Delete Memory command
- View Memory Details command
- Statistics view panel
- Project isolation using git root detection
- SQLite-based local storage
- 5 memory types: fact, decision, code, config, note

### Technical

- Built with Bun and TypeScript
- Uses sql.js for browser-compatible SQLite
- Integrates with MCP server for AI tool connectivity

## [0.1.0] - 2024-12-08

### Added

- Initial project setup
- Core storage module
- Basic extension structure

[0.3.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EcuaByte-lat/Cortex/releases/tag/v0.1.0
