# Cortex documentation

This page defines where to look for each kind of truth.

## Authority order

1. **Code** — what is actually implemented.
2. **Strategy** — product thesis and boundaries.
3. **Architecture contracts** — domain and interface requirements for the current product.
4. **ADRs** — technical decisions and their reasons.
5. **Roadmap** — sequence, status, metrics, and exit gates.
6. **README and guides** — public promises and usage instructions.
7. **Agent instructions** — how agents should work in the repository.
8. **Research and distribution documents** — hypotheses backed by public evidence, not product guarantees.

## Index

- [Strategy](./strategy/README.md)
- [Architecture](./architecture/README.md)
- [Handoff contract](./architecture/HANDOFF_CONTRACT.md)
- [Getting started](./getting-started/quick-start.md)
- [Supported tools](./SUPPORTED_TOOLS.md)
- [Universal setup](./UNIVERSAL_SETUP.md)
- [Development](./DEVELOPMENT.md)
- [CI/CD integration](./CI_CD_INTEGRATION.md)

## Documentation status labels

Use one of these labels when describing a capability:

- **Implemented** — exists in code and has relevant tests.
- **Experimental** — exists partially or is not yet reliable across supported environments.
- **Planned** — approved direction without a complete implementation.
- **Deferred** — intentionally postponed by the product boundary.
- **Legacy** — historical API or positioning retained for compatibility.

Never describe MCP transport compatibility as equivalent to a verified handoff capability.
