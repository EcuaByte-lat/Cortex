# Cortex Strategy

This directory is the canonical product and go-to-market reference for Cortex.

## Current thesis

> Cortex is a local-first, evidence-backed state plane that lets humans and coding agents resume software work safely across sessions, tools, vendors, and repositories.

The product wedge is not generic AI memory. It is a reliable handoff:

```text
task -> attempt -> branch/commit -> evidence -> decision -> artifact -> verification -> next action
```

## Canonical documents

- [Product direction](./PRODUCT_DIRECTION.md) — product boundary, vocabulary, principles, buyer, and business hypothesis.
- [Market research](./MARKET_RESEARCH.md) — public evidence, competitors, standards, risks, and the limits of what is proven.
- [Distribution](./DISTRIBUTION.md) — channel sequence and repository-native growth loops.
- [Adoption and compounding](./ADOPTION.md) — how Cortex becomes useful first, habitual second, and operationally necessary later.

## Decision rules

1. Do not describe Cortex as a universal memory product in new documentation.
2. Do not build a generic graph, vector store, or dashboard before proving that handoffs improve continuation outcomes.
3. Every new integration must either create evidence, verify evidence, or make a handoff easier to consume.
4. The first useful result must work locally, without a hosted account.
5. A record without source, scope, freshness, and authority is a hint, not project truth.
6. Distribution work must be tied to a measurable activation or retention event.
7. Product claims must distinguish public evidence, vendor-reported metrics, and Cortex hypotheses.

## Current north-star metric

**Verified continuations per active project per week**: the number of times a human or agent resumes a task using a Cortex handoff and reaches the next verified engineering milestone.

Downloads, memory count, raw MCP calls, and dashboard views are supporting metrics, not the north star.
