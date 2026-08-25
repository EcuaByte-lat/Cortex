# 🛠️ Supported Tools & Editors (2026 Ready)

Cortex is designed to be the **portable engineering-state and handoff layer** for AI development tools. It builds upon the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing compatible tools to consume the same evidence-backed project state.

## ✅ Configured and experimental integrations

These editors can be configured by the **Auto-Installer**. The support level describes transport or UI integration; it does not claim that capture, handoff, resume, and verification are all implemented.

| Editor | Support Level | Config Method |
|--------|---------------|---------------|
| **Cursor** | MCP + fallback adapter | `cortex install --project .` |
| **Windsurf** | MCP | `cortex install --project .` |
| **Antigravity IDE** | MCP | `cortex install --project .` |
| **Gemini CLI** | MCP + bridge adapter | `cortex install --project .` |
| **VS Code** | Native extension + MCP | [Extension](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode) |
| **Claude Desktop** | MCP | `cortex install --editor claude-desktop` |
| **Claude Code** | MCP + lifecycle hooks | `cortex install --project .` |
| **Codex CLI** | MCP + `AGENTS.md` + Git evidence hooks | `cortex setup` |
| **OpenCode** | MCP + project plugin | `cortex install --project .` |
| **Zed** | MCP | `cortex install --project .` |

## 🔌 MCP Handoff Support

Any tool that supports the Model Context Protocol (MCP) can connect to Cortex manually using the standard configuration:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bunx",
      "args": ["@ecuabyte/cortex-mcp-server"]
    }
  }
}
```

### MCP transport verified
- **Goose** (Block)
- **OpenInterpreter**
- **Aider** (via MCP adapter)
- **Roo Code** (VS Code Extension)

## 🔮 Future compatibility candidates

As an open-source project, Cortex may support:
- All major IDEs via MCP.
- Terminal-based agents.
- Browser-based development environments (IDX, Codespaces).
