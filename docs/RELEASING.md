# Releasing Cortex

Cortex publishes its runtime npm packages from the `main` branch through
`.github/workflows/unified.yml`. The release job uses npm Trusted Publishing
with GitHub Actions OIDC; it does not require a long-lived `NPM_TOKEN`.

## One-time npm configuration

Configure a trusted publisher in the npm settings for each package:

- `@ecuabyte/cortex-shared`
- `@ecuabyte/cortex-core`
- `@ecuabyte/cortex-cli`
- `@ecuabyte/cortex-mcp-server`

Use these exact GitHub Actions values for every package:

- Organization or user: `EcuaByte-lat`
- Repository: `Cortex`
- Workflow filename: `unified.yml`
- Environment name: leave empty
- Allowed action: `npm publish`

The npm account configuring this must be an owner or maintainer with publish
permission for the `@ecuabyte` scope.

Trusted Publishing requires GitHub Actions `id-token: write` permission and a
recent npm CLI. The workflow therefore uses Node.js 24, which includes a
compatible npm CLI. npm generates provenance automatically for public packages
published from this public repository.

## Release flow

1. Add a Changeset describing the package changes.
2. Merge the Changesets release PR into `main`.
3. The `Release` job publishes npm packages in dependency order.
4. The job compares the extension version with VS Code Marketplace and Open VSX,
   then publishes `cortex-vscode` only when a newer version is present.
5. The job creates the matching GitHub Release (`cortex-vscode@<version>`) with
   the generated `.vsix` attached, unless that release already exists.

The VS Code extension is intentionally not published to npm. Its distribution
channels are VS Code Marketplace, Open VSX, and GitHub Releases. Marketplace
publication uses a
GitHub Actions `VSCE_PAT` secret with the minimum Azure DevOps scope
`Marketplace (Manage)`.

The current Marketplace publisher UI manages Azure DevOps/Marketplace users;
it does not accept an arbitrary Microsoft Entra App Registration Object ID.
Microsoft Entra workload identity federation is supported through an Azure
user-assigned managed identity, which requires an Azure subscription. It can
be adopted later without changing the extension package.

Create or rotate the PAT in Azure DevOps with:

- Organization: `All accessible organizations`
- Scopes: Custom defined → `Marketplace (Manage)`

Store it in GitHub as the encrypted repository secret `VSCE_PAT`. Never commit
it or place it in `.npmrc`.

After configuring Trusted Publishing, rerun a failed release job from GitHub
Actions. Do not add an npm token to the repository or commit a local `.npmrc`.

## MCP Registry metadata

The MCP server includes `mcpName` in
`packages/mcp-server/package.json` and matching `server.json` metadata at the
repository root. The official MCP Registry stores metadata, not package
artifacts, so publish `@ecuabyte/cortex-mcp-server` to npm before publishing a
new matching version with `mcp-publisher`.

```bash
mcp-publisher login github
mcp-publisher publish
```

Keep the `version` in `server.json` equal to the published npm package version.
The registry treats published metadata versions as immutable; update both
versions for every release.
