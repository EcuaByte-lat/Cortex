# Contributing to Cortex

First off, thanks for taking the time to contribute! 🎉

## Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/EcuaByte-lat/Cortex.git
   cd Cortex
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Build packages**
   ```bash
   bun run build
   ```

## Workflow
- We use **Changesets** for versioning. If you modify a package, run `bunx changeset` to generate a changelog entry.
- We use **Biome** for linting and formatting. Run `bun run check:ci` before committing.

## Pull Requests
- Fill out the PR template.
- Ensure all tests pass (`bun run test:all`).
