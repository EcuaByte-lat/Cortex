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

The VS Code extension is intentionally not published to npm. Its distribution
channels are VS Code Marketplace and Open VSX. Marketplace publication uses
Microsoft Entra workload identity federation with
`@vscode/vsce publish --azure-credential`. The workflow obtains a short-lived
Azure DevOps access token through `azure/login@v2`; it does not require
`VSCE_PAT`.

Create a user-assigned managed identity in Azure and configure a federated
credential for this GitHub Actions subject:

- Issuer: `https://token.actions.githubusercontent.com/`
- Subject: `repo:EcuaByte-lat/Cortex:ref:refs/heads/main`
- Audience: `api://AzureADTokenExchange`

Authorize that identity in the `EcuaByte` Visual Studio Marketplace publisher
with the Contributor role. Then add these GitHub Actions secrets:

- `AZURE_CLIENT_ID`: managed identity client ID
- `AZURE_TENANT_ID`: Microsoft Entra tenant ID

The workflow already requests `id-token: write` and uses
`allow-no-subscriptions: true`; no Azure subscription ID, client secret, or
Marketplace PAT is needed by the release job.

After configuring Trusted Publishing, rerun a failed release job from GitHub
Actions. Do not add an npm token to the repository or commit a local `.npmrc`.
