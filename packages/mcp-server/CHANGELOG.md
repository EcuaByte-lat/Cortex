# @ecuabyte/cortex-mcp-server

## 0.8.3

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.8.3

## 0.8.2

### Patch Changes

- [`b3ebd1e`](https://github.com/EcuaByte-lat/Cortex/commit/b3ebd1e352b3eb6112006c7e8c5c9276b60d0e80) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - feat: add Gemini MCP config with official schema support

  - Added `--target gemini` option to `generate-config` command
  - Gemini config now includes `$schema`, `trust`, and `description` fields
  - Updated `installer.ts` to generate proper Gemini settings.json
  - Updated documentation with correct Gemini configuration format

  Users can now run:

  ```bash
  bunx @ecuabyte/cortex-mcp-server generate-config --target gemini
  ```

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.8.2

## 0.8.1

### Patch Changes

- [`74a0e4c`](https://github.com/EcuaByte-lat/Cortex/commit/74a0e4ca670b8e96081f171c378f1d7bc49f2709) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - chore: migrate from npx to bunx for Bun runtime compatibility

  - Changed MCP server build target from `node` to `bun`
  - Added `#!/usr/bin/env bun` shebang to bundled output
  - Updated all configuration generators to output `bunx` commands
  - Updated installer.ts to generate bunx configs for all editors
  - Updated documentation (README, UNIVERSAL_SETUP.md) with bunx instructions

  Users now need Bun installed to run: `bunx @ecuabyte/cortex-mcp-server`

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.8.0

## 0.6.2

### Patch Changes

- Fix workspace dependency resolution for npm installation

  - Changed workspace:\* to workspace:^ for proper semver resolution
  - Added custom publish script using bun publish instead of changeset publish
  - bun publish properly resolves workspace: protocol to actual versions

  See: https://github.com/oven-sh/bun/issues/24687

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.6.2

## 0.6.1

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.6.1

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

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.6.0

## 0.5.13

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.5.13

## 0.5.12

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.5.12

## 0.5.11

### Patch Changes

- Updated dependencies []:
  - @ecuabyte/cortex-core@0.5.11

## 0.5.10

### Patch Changes

- [`8c92d4d`](https://github.com/EcuaByte-lat/Cortex/commit/8c92d4d75df67ef7a14fface1626dbb17b8654dc) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: update vsce publish command to skip dependency check for Bun monorepo compatibility

- Updated dependencies [[`8c92d4d`](https://github.com/EcuaByte-lat/Cortex/commit/8c92d4d75df67ef7a14fface1626dbb17b8654dc)]:
  - @ecuabyte/cortex-core@0.5.10

## 0.5.9

### Patch Changes

- [`4c54847`](https://github.com/EcuaByte-lat/Cortex/commit/4c548472f6f30939358888e6f1ce5d8776f4cf18) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: remove .vscodeignore to allow using files whitelist for clean VSIX packaging

- Updated dependencies [[`4c54847`](https://github.com/EcuaByte-lat/Cortex/commit/4c548472f6f30939358888e6f1ce5d8776f4cf18)]:
  - @ecuabyte/cortex-core@0.5.9

## 0.5.8

### Patch Changes

- [`9083765`](https://github.com/EcuaByte-lat/Cortex/commit/9083765151f5bf29f3f429a07ea810664e02b4f0) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: whitelist VSIX files to prevent symlink traversal error in VS Code extension packaging

- Updated dependencies [[`9083765`](https://github.com/EcuaByte-lat/Cortex/commit/9083765151f5bf29f3f429a07ea810664e02b4f0)]:
  - @ecuabyte/cortex-core@0.5.8

## 0.5.7

### Patch Changes

- [`1949f1b`](https://github.com/EcuaByte-lat/Cortex/commit/1949f1b87d5089f91c0b20ff551e820cd3ae1775) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: resolve all lint warnings and upgrade biome config
  codestyle: fix non-null assertions and string concatenation
- Updated dependencies [[`1949f1b`](https://github.com/EcuaByte-lat/Cortex/commit/1949f1b87d5089f91c0b20ff551e820cd3ae1775)]:
  - @ecuabyte/cortex-core@0.5.7

## 0.5.6

### Patch Changes

- cc4ed85: fix: rename packages to @ecuabyte scope and setup changesets coverage
- Updated dependencies [cc4ed85]
  - @ecuabyte/cortex-core@0.5.6
