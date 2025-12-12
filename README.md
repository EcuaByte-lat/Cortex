# 🧠 Cortex

<p align="center">
  <img src="docs/branding/png/icon-512.png" alt="Cortex Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Persistent memory for AI coding assistants</strong>
</p>

<p align="center">
  <a href="https://github.com/EcuaByte-lat/Cortex/actions/workflows/ci.yml"><img src="https://github.com/EcuaByte-lat/Cortex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.0+-black?logo=bun" alt="Bun"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript"></a>
</p>

---

Stop repeating yourself to AI tools. Cortex remembers your project context across all sessions and tools.

**The Problem:** AI assistants forget everything between sessions.  
**The Solution:** Local-first memory system with CLI, MCP server, and VS Code extension.

## ✨ Features

- 🧠 **Persistent Memory** - Context that survives sessions
- 🔗 **Multi-Tool Integration** - Works with Claude, Copilot, Cursor, Continue
- 📁 **Project Isolation** - Automatic project detection and memory isolation
- ⚡ **Local-First** - Fast, offline-capable, zero configuration
- 🎨 **Visual Interface** - VS Code extension with TreeView and Webview
- 🔍 **Full-Text Search** - Find memories instantly
- 🏷️ **5 Memory Types** - fact, decision, code, config, note

## 🛠️ Stack

- **Bun** - Runtime + Bundler (50x faster than npm)
- **SQLite** - Local database (bun:sqlite native)
- **MCP** - Model Context Protocol (Anthropic)
- **VS Code API** - Extension with TreeView + Webview
- **TypeScript** - Type safety throughout
- **Monorepo** - Clean architecture with Bun Workspaces

## Arquitectura

```
cortex/
├── packages/
│   ├── core/              # Storage layer (SQLite + tipos)
│   ├── cli/               # Interfaz de línea de comandos
│   ├── mcp-server/        # Servidor MCP para AI tools
│   └── vscode-extension/  # Extensión visual para VS Code
├── build.ts               # Build script del monorepo
└── bunfig.toml           # Configuración Bun
```

## Quick Start

```bash
# 1. Install
bun install

# 2. Build
bun run build

# 3. Try CLI
bun --cwd packages/cli run dev add -c "First memory" -t "fact" -s "test"
bun --cwd packages/cli run dev list

# 4. VS Code Extension
# Press F5 to open Extension Development Host
```

## MCP Integration (AI Tools)

Configure Cortex to work with Claude, Copilot, Cursor, and Continue.

### VS Code + Copilot

1. `Ctrl+Shift+P` → "MCP: Open User Configuration"
2. Add:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

3. Restart VS Code
4. In Copilot Chat: `@cortex search "database"`

### Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

Restart Claude Desktop.

## 📚 Documentation

- **[Quick Start](./docs/getting-started/quick-start.md)** - 5-minute setup
- **[Development Guide](./docs/DEVELOPMENT.md)** - For contributors
- **[Architecture Decisions](./docs/architecture/decisions/)** - Design rationale

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install && bun run build && bun test
```

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/EcuaByte-lat">EcuaByte</a></strong>
</p>
