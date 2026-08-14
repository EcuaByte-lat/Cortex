# Cortex Market Research: Verified Engineering State

**Research date:** 2026-08-14
**Method:** Web research, public documentation, pricing, funding announcements, open-source repositories, and codebase review. No interviews.

## Executive conclusion

There is credible demand and spending around AI coding agents, memory infrastructure, and agent governance. The exact category “shared engineering state between coding agents” is still early and fragmented, so a large market cannot be claimed yet.

The strongest opportunity is the layer between agent execution and engineering-system truth: task continuity, evidence, provenance, freshness, conflicts, and verified handoffs.

## Market signals

- Stack Overflow reports that 84% of developers use or plan to use AI tools, while accuracy, security, and “almost right” results remain major concerns. Only a minority of developers report meaningful collaboration improvements from agents. [2025 AI Survey](https://survey.stackoverflow.co/2025/ai)
- McKinsey reports that 23% of organizations are scaling agentic AI systems and another 39% are experimenting, which suggests a growing but immature market. [State of AI](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)
- GitHub’s agent workflow is already organized around issues, branches, pull requests, review, and security checks. [Kick off a task with Copilot agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task)
- Public research is beginning to benchmark multi-agent memory governance, deletion, access boundaries, and long-horizon task continuity. [GateMem](https://arxiv.org/abs/2606.18829) and [MemoryArena](https://arxiv.org/abs/2602.16313) are evidence that memory quality and governance are becoming measurable engineering problems.

## Money already present in adjacent categories

| Company/category | Public signal | What it validates |
|---|---|---|
| Mem0 | $24M reported funding; company-reported developer and API usage | Memory infrastructure can attract capital and developer adoption |
| Supermemory | $3M reported funding; cross-tool MCP memory | Portable memory across AI clients is commercially interesting |
| Letta | $10M seed reported for stateful agents | Stateful agent runtimes have investor interest |
| Zep | Paid plans from $104/month and enterprise/BYOC options | Teams pay for temporal memory and governance |
| MCP gateways | IBM ContextForge, Microsoft MCP Gateway, Kong, Tyk | Enterprises pay for agent tool discovery, policy, routing, and observability |

Sources: [Mem0 funding](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps/), [Supermemory funding](https://supermemory.ai/blog/supermemory-raises-3-million-and-building-the-best-memory-engine-for-llms/), [Letta funding](https://www.prnewswire.com/news-releases/berkeley-ai-research-lab-spinout-letta-raises-10m-seed-financing-led-by-felicis-to-build-ai-with-memory-302257004.html), [Zep pricing](https://www.getzep.com/pricing/), [IBM ContextForge](https://ibm.github.io/mcp-context-forge/latest/overview/).

These signals validate the budget category, not Cortex's exact product-market fit.

## Vendor absorption risk

Memory inside a single vendor is becoming normal. Claude Code documents project and user memory; GitHub Copilot documents repository memory and preferences. [Claude Code memory](https://code.claude.com/docs/en/memory), [Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory)

This makes simple `remember`, `recall`, vector search, README scanning, and project rules weak differentiators. The defensible surface is the project record that survives a change of model, IDE, agent vendor, machine, or runtime:

- cross-vendor handoff;
- repository, branch, commit, task, and artifact identity;
- provenance, authority, freshness, and supersession;
- verification outcomes and conflicts;
- export, local-only operation, BYOC, and enterprise policy.

This is an inference from current vendor capabilities and does not prove that vendors will not build the same workflow.

## Competitive map

### Generic shared memory

- Mem0: strongest public funding/adoption signal; hosted MCP memory across many clients.
- Supermemory: personal and cross-tool memory with direct MCP distribution.
- SharedMemory: team memory, decision engine, graph, conflict detection, and MCP connectors.
- Zep: temporal graph memory and enterprise controls, primarily as application infrastructure.

### Coding-agent local memory and coordination

- ENGRAM, MACP, mnemon, paradigm-memory, and codex-agent-mem show that developers want a single local memory or coordination layer across Codex, Claude Code, Cursor, Gemini, and other agents.
- These projects validate the pain but do not yet prove a large paid market. Most are early open source and do not publish meaningful revenue or retention data.

### Tool gateways

- [IBM ContextForge](https://ibm.github.io/mcp-context-forge/latest/overview/) federates MCP, A2A, REST, and gRPC with governance and observability.
- [Microsoft MCP Gateway](https://microsoft.github.io/mcp-gateway/) centralizes tool routing and session handling.
- [Kong AI Gateway](https://developer.konghq.com/ai-gateway/) and [Tyk MCP Gateway](https://tyk.io/docs/ai-management/mcp-gateway/overview) target policy, authentication, and operations.

These are adjacent competitors. They solve “which tools can agents call?” rather than “what verified project state should the next agent trust?”

## Unmet gap

The unresolved product surface is a durable, portable, engineering-specific record that links:

```text
task -> agent attempt -> repository/branch/commit -> evidence -> decision -> artifact -> verification
```

Generic memory systems can recall a decision. Git can show a diff. CI can show a test. Issue trackers can show a task. None of those alone provides a trustworthy continuation packet with freshness, authority, conflicts, and next action.

## Main risks

1. GitHub, GitLab, IDE vendors, or agent vendors may build adequate native handoffs.
2. Users may prefer simple AGENTS.md, CLAUDE.md, and Markdown conventions.
3. Automatic capture can create noise, sensitive data, or false certainty.
4. A hosted product may face data residency and source-code privacy objections.
5. MCP distribution is crowded; installation does not equal retention.
6. The product could become a dashboard without improving engineering outcomes.

The exact category lacks a reliable public TAM figure or public revenue benchmark. Treat broad AI-agent market estimates as category context, not as evidence for Cortex's obtainable market.

## Strategic response

- Use Git/CI/PR events as evidence rather than trying to replace them.
- Make the first artifact a portable handoff that can be reviewed in GitHub.
- Keep local-first and self-hosted paths credible.
- Add automatic capture only for high-signal events; let users correct or reject records.
- Publish benchmark results against Markdown, generic memory, and no-memory baselines.
- Treat provenance and freshness as product features, not metadata added later.
- Measure repositories and verified continuations, not memories or raw MCP calls.
- Use GitHub Actions, MCP Registry, npm/Bun, editor marketplaces, and public benchmarks as the initial distribution surface; defer cloud marketplaces until enterprise readiness exists.
