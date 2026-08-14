# @ecuabyte/cortex-core

## 0.8.3

## 0.8.2

## 0.8.1

## 0.8.0

## 0.6.2

### Patch Changes

- Fix workspace dependency resolution for npm installation

  - Changed workspace:\* to workspace:^ for proper semver resolution
  - Added custom publish script using bun publish instead of changeset publish
  - bun publish properly resolves workspace: protocol to actual versions

  See: https://github.com/oven-sh/bun/issues/24687

## 0.6.1

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

## 0.5.12

## 0.5.11

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
