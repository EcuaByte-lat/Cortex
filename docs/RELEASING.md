# Releasing Cortex

Cortex publishes its npm packages from the `main` branch through
`.github/workflows/unified.yml`. The release job uses npm Trusted Publishing
with GitHub Actions OIDC; it does not require a long-lived `NPM_TOKEN`.

## One-time npm configuration

Configure a trusted publisher in the npm settings for each package:

- `@ecuabyte/cortex-shared`
- `@ecuabyte/cortex-core`
- `@ecuabyte/cortex-cli`
- `@ecuabyte/cortex-mcp-server`
- `cortex-vscode`

Use these exact GitHub Actions values for every package:

- Organization or user: `EcuaByte-lat`
- Repository: `Cortex`
- Workflow filename: `unified.yml`
- Environment name: leave empty
- Allowed action: `npm publish`

The npm account configuring this must be an owner or maintainer with publish
permission for the `@ecuabyte` scope and the `cortex-vscode` package.

Trusted Publishing requires GitHub Actions `id-token: write` permission and a
recent npm CLI. The workflow therefore uses Node.js 24, which includes a
compatible npm CLI. npm generates provenance automatically for public packages
published from this public repository.

## Release flow

1. Add a Changeset describing the package changes.
2. Merge the Changesets release PR into `main`.
3. The `Release` job publishes npm packages in dependency order.
4. If `cortex-vscode` is included, the job publishes it to VS Code Marketplace
   and Open VSX.

After configuring Trusted Publishing, rerun a failed release job from GitHub
Actions. Do not add an npm token to the repository or commit a local `.npmrc`.
