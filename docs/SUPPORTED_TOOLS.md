# 🛠️ Supported Tools & Editors (2026 Ready)

Cortex is designed to be the **portable engineering-state and handoff layer** for AI development tools. It builds upon the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing compatible tools to consume the same evidence-backed project state.

## ✅ Configured and experimental integrations

These editors can be configured by the **Auto-Installer**. The support level describes transport or UI integration; it does not claim that capture, handoff, resume, and verification are all implemented.

| Editor | Support Level | Config Method |
|--------|---------------|---------------|
| **Cursor** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target cursor` |
| **Windsurf** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target windsurf` |
| **Antigravity IDE** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target antigravity` |
| **Gemini CLI** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target gemini` |
| **VS Code** | ⭐ Native | [Extension](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode) or MCP |
| **Claude Desktop** | ⭐ Full | `bunx @ecuabyte/cortex-mcp-server generate-config --target claude-desktop` |
| **Claude Code** | ⭐ Experimental | `bunx @ecuabyte/cortex-mcp-server generate-config --target claude` |
| **Zed** | 🟢 Standard | `bunx @ecuabyte/cortex-mcp-server generate-config --target zed` |

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
