# Cortex Distribution Strategy

**Status:** Working distribution plan
**Updated:** 2026-08-25
**Principle:** Distribute Cortex through the places where engineering state is created, reviewed, and resumed.

## Distribution thesis

Cortex should not depend on a single marketplace or on paid acquisition. The product should enter through a low-friction developer surface, create a useful handoff or verification artifact, and then spread through the repository and team workflow.

The long-term loop is:

```text
install -> capture evidence -> generate handoff -> attach to PR/issue
       -> next agent resumes -> fewer repeated tasks -> team adopts shared state
       -> governance/retention becomes valuable -> paid workspace
```

The repository is the growth unit, not the individual chat session. A channel is successful only when it moves a repository from installation to a second verified continuation.

## Channel map

### Tier 1: immediate developer discovery and installation

These channels are low-cost and directly aligned with the current repository.

| Channel | Entry product | Why it matters | Priority |
|---|---|---|---:|
| GitHub repository | README, examples, benchmark, releases | Trust, source discovery, contribution, search | P0 |
| npm/Bun package registry | `npx`/`bunx` CLI and MCP server | One-command installation and automation | P0 |
| Official MCP Registry | Verified MCP server metadata | Discovery by MCP clients and ecosystem tooling | P0 |
| Glama and Smithery | MCP listing, hosted/local install, analytics | Distribution and install telemetry | P0 |
| VS Code Marketplace | Extension with “resume task” and evidence view | Highest-leverage IDE surface already present | P0 |
| Open VSX | Same extension for VSCodium and compatible editors | Open-source and alternative IDE reach | P0 |
| GitHub Releases | Signed binaries, VSIX, changelog | Air-gapped and manual installation | P0 |

The official MCP Registry hosts metadata rather than artifacts and expects the underlying package to be published elsewhere, commonly npm. [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart) Glama provides discovery, inspection, distribution, and analytics. [Glama](https://glama.ai/) Smithery offers server distribution and analytics through its gateway. [Smithery](https://smithery.mintlify.app/build)

npm is therefore not just a package channel; it is part of the MCP installation path. [npm publish](https://docs.npmjs.com/cli/publish/)

The official MCP Registry stores server metadata rather than artifacts, so the package and its release process must remain healthy outside the registry. [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart)

### Tier 2: workflow-native distribution

| Channel | Entry product | Activation event |
|---|---|---|
| GitHub App | Task/PR state, comments, checks, repository installation | User installs on a repository |
| GitHub Action | Capture commits/tests and publish a handoff artifact | Workflow runs on push/PR |
| GitHub Codespaces/devcontainer | Preconfigured Cortex CLI/MCP | User opens a project environment |
| Issue templates | “Agent task” template with acceptance and handoff fields | User creates a task |
| PR checks/comments | Evidence completeness and stale-state warnings | PR is opened or updated |
| CI providers | GitLab, CircleCI, Buildkite, Jenkins adapters | Test or deployment completes |
| Git hooks | Capture high-signal local events | Commit, branch switch, or test command |

GitHub is the best first workflow because coding agents already work through issues, branches, pull requests, and reviews. GitHub Marketplace supports both Apps and Actions; Actions can be published by anyone, while paid Apps require an organization-owned app. [GitHub Marketplace](https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps)

GitHub Actions are especially attractive for the first proof because a public repository can publish an action when it has the required metadata and release. [Publishing Actions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) The initial Cortex action should create a reviewable handoff artifact and verification result, not require a Cortex account.

### Tier 3: editor and agent ecosystem

| Channel | Opportunity |
|---|---|
| JetBrains Marketplace | Native task/evidence panel and MCP setup |
| Zed registry | MCP server or lightweight extension |
| Cursor/Windsurf/Claude Code/Gemini/Codex docs | Copy-paste configuration and verified recipes |
| Dev containers and Docker | Reproducible local server and team bootstrap |
| Homebrew / Scoop / Chocolatey | Native CLI discovery for developers |
| PyPI | Optional Python SDK and automation client |
| Go/Rust registries | Later SDKs or local daemon implementations |

JetBrains supports public and private plugin distribution through its Marketplace. [JetBrains Marketplace](https://plugins.jetbrains.com/docs/marketplace/getting-started.html) Zed distributes extensions through a GitHub-backed registry. [Zed extensions](https://zed.dev/docs/extensions/developing-extensions)

### Tier 4: engineering planning and communication systems

These should follow proof of the handoff workflow, not precede it.

- Jira and Confluence Marketplace: task state, decision records, and PR evidence.
- Linear Integration Directory: task and project continuity.
- Slack Marketplace: handoff notifications, approval requests, and searchable summaries.
- Microsoft Teams: enterprise notifications and approvals.
- Notion: export or synchronization of decision records, not the primary source of truth.

Atlassian has more than 4,000 Marketplace apps and supports install and purchase inside customer instances. [Atlassian Marketplace](https://www.atlassian.com/software/marketplace) Linear maintains an integration directory for external applications. [Linear integrations](https://linear.app/docs/integration-directory) Slack positions its Marketplace as a primary discovery and distribution channel for team applications. [Slack Marketplace](https://slack.dev/introducing-the-slack-marketplace/)

### Tier 5: enterprise procurement and infrastructure

- AWS Marketplace: hosted SaaS, container, Helm, or private offer.
- Azure Marketplace: enterprise procurement and Microsoft identity.
- Google Cloud Marketplace: later Kubernetes/SaaS route.
- Cloudflare: remote MCP and edge-hosted control plane where appropriate.
- Docker Hub and OCI registries: self-hosted server and evaluation images.
- Helm and Terraform registries: platform-team installation.
- Resellers, MSPs, cloud partners, and developer productivity consultancies.

AWS Marketplace supports SaaS, container products, professional services, private offers, and centralized billing. [AWS Marketplace](https://docs.aws.amazon.com/marketplace/latest/userguide/what-is-marketplace.html) This channel becomes important only after the product has SSO, audit logs, deployment documentation, and a clear security posture.

AWS private offers can cover SaaS, containers, AMIs, and professional services, making the marketplace useful for later procurement rather than initial discovery. [AWS private-offer product types](https://docs.aws.amazon.com/marketplace/latest/userguide/private-offers-supported-product-types.html)

## Channel scorecard

| Channel | Initial buyer | Entry artifact | Main friction | Growth loop | Priority |
|---|---|---|---|---|---:|
| GitHub Action | Maintainer / platform engineer | PR handoff and verification check | Permissions and CI reliability | One workflow copied to more repositories | P0 |
| npm/Bun CLI | Developer | `bunx`/`npx` install and local handoff | Packaging and runtime compatibility | Scripts and templates repeat installation | P0 |
| MCP Registry | MCP user / tool catalog | Verified server metadata | Registry is not the artifact host | Clients and directories discover Cortex | P0 |
| VS Code/Open VSX | IDE user | Resume task command and evidence panel | Marketplace review and extension quality | Editor use creates repeated sessions | P0 |
| GitHub App | Organization admin | PR/issue integration | OAuth, permissions, security review | One install expands across repositories | P1 |
| Devcontainer/Docker | Team/platform engineer | Reproducible project bootstrap | Image maintenance and secrets | New contributors inherit the workflow | P1 |
| Technical content/benchmarks | Senior developer | Public result against a baseline | Requires credible evidence | Search and shares create qualified installs | P0 |
| Consultancies/partners | Platform consultancy | Assessment and pilot playbook | Enablement and partner margin | One partner activates many teams | P2 |
| Cloud marketplace | Procurement / cloud platform | SaaS, container, or private offer | Enterprise readiness and billing | Existing cloud budget accelerates purchase | P2 |

## Channel order and gates

### Gate A: discoverable and installable

Ship the CLI/MCP package, official MCP metadata, one GitHub Action, editor setup recipes, and a benchmark repository. Do not add paid acquisition yet.

### Gate B: repository-native proof

Require the Action to publish a handoff artifact that is useful without an account. Promote repositories only when the second session or agent successfully consumes the artifact.

### Gate C: team expansion

Add a GitHub App, shared workspace, sync, retention, RBAC, and audit export only after repeated repository use is visible. These are adoption and monetization surfaces, not prerequisites for the first local result.

### Gate D: enterprise procurement

Add cloud marketplaces, private offers, partners, and direct sales when security documentation, deployment options, support, and a measurable team outcome exist.

## Recommended sequence

### Stage A — searchable and installable

Ship one excellent CLI/MCP install, a real VS Code experience, a GitHub Action, official MCP Registry listing, Glama/Smithery listings, and a benchmark repository.

Success signals:

- package installs and unique active projects;
- completed first handoff;
- handoffs resumed by another session or agent;
- GitHub Action runs and PR artifacts opened;
- benchmark tasks show measurable continuation improvement.

### Stage B — repository-native loop

Add a GitHub App or Action that creates a handoff artifact and PR check. Make the artifact reviewable without a Cortex account.

Success signals:

- repositories with repeated weekly use;
- handoff artifact attached to real PRs;
- second agent or teammate consuming the artifact;
- fewer repeated commands/files in benchmark runs.

### Stage C — team adoption

Add remote sync, workspace membership, RBAC, audit export, SSO, retention, and GitHub/GitLab integration. Add Slack/Linear/Jira only when they improve an existing handoff event.

Success signals:

- multiple contributors or agents per workspace;
- weekly retained teams;
- organizations enforcing verification policies;
- conversion from local/open-source usage to paid workspaces.

### Stage D — procurement and partners

Publish AWS/Azure/GCP deployment options, self-hosted Helm/Docker, security documentation, and partner enablement. Use agencies and platform teams as multipliers rather than trying to sell to every developer directly.

## Compounding mechanisms

1. **Artifact loop:** Every useful handoff creates a visible, shareable artifact in the repository.
2. **Integration loop:** Each verified commit, test, and PR increases the usefulness of future handoffs.
3. **Team loop:** The next agent or teammate benefits without needing to know the original author.
4. **Trust loop:** Provenance, freshness, and verification reduce the risk of adopting more agents.
5. **Benchmark loop:** Public evaluation makes improvement visible and creates technical SEO and community content.
6. **Template loop:** Repository templates and devcontainers make Cortex present in new projects from day one.

## What not to do yet

- Do not buy broad developer ads before retention is proven.
- Do not build ten marketplace integrations without one repeated workflow.
- Do not lead with “AI memory”; lead with “resume engineering work with evidence.”
- Do not require hosted storage for the first useful result.
- Do not make the dashboard the product; the handoff and verification event are the product.
- Do not confuse marketplace listing, package download, or MCP connection with product activation.
- Do not lead with “works with every AI tool”; lead with the verified continuation outcome.

## Distribution metrics

Track the funnel by channel:

```text
discovery -> install -> first capture -> first handoff -> successful resume
          -> repeat project use -> team invite -> paid workspace
```

The north-star metric is **verified continuations per active project per week**, not downloads or raw memory count.
