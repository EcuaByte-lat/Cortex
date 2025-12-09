# 🧠 Cortex

[![CI](https://github.com/AngelAlexQC/Cortex/actions/workflows/ci.yml/badge.svg)](https://github.com/AngelAlexQC/Cortex/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)

> **Persistent memory for AI coding assistants**

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
# 1. Instalar dependencias
bun install

# 2. Construir todos los paquetes
bun run build

# 3. Probar CLI
bun run dev:cli list
bun --cwd packages/cli run dev add -c "Primera memoria" -t "fact" -s "test"

# 4. Probar MCP server
bun run dev:mcp

# 5. Desarrollar extensión VS Code
# Presiona F5 en VS Code (abre Extension Development Host)
```

## Integración con AI Tools

## VS Code Extension 🎨

**Nueva característica:** Interfaz gráfica para gestionar memories visualmente.

### Features
- **TreeView en Sidebar**: Navegación por categorías (Facts, Decisions, Code, Config, Notes)
- **Webview Panel**: Vista detallada con formato elegante
- **Comandos integrados**: Agregar, buscar, eliminar memories desde VS Code
- **Sincronización automática**: Comparte la misma base de datos con CLI y MCP

### Instalación Local
```bash
# Presiona F5 para abrir Extension Development Host
# O usa: Ctrl+Shift+P → "Debug: Start Debugging"
```

La extensión aparecerá en la barra lateral (icono de Cortex).

## Integración con AI Tools (MCP Server)

### VS Code + GitHub Copilot (Recomendado)

VS Code tiene soporte nativo MCP desde abril 2025.

**Opción 1: Configuración Global (User)**
```
Ctrl+Shift+P → "MCP: Open User Configuration"
```

**Opción 2: Por Workspace**
Crea `.vscode/mcp.json` en tu proyecto:

```json
{
  "servers": {
    "cortex": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "C:\\Code\\Cortex\\packages\\mcp-server\\dist\\mcp-server.js"]
    }
  }
}
```

Reinicia VS Code. Copilot ahora tiene acceso a:
- `cortex_search` - Buscar memories
- `cortex_add` - Agregar memory
- `cortex_list` - Listar memories
- `cortex_stats` - Estadísticas

**Uso:** Abre Copilot Chat (`Ctrl+Alt+I`) y pregunta:
```
"What memories do you have about this project?"
"Remember that we're using React 18"
"Search for information about our database"
```

### Claude Desktop

Edita `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "C:\\Code\\Cortex\\packages\\mcp-server\\dist\\mcp-server.js"]
    }
  }
}
```

Reinicia Claude Desktop.

### Continue.dev Extension

Crea `.continue/mcpServers/cortex.json`:

```json
{
  "cortex": {
    "command": "bun",
    "args": ["run", "C:\\Code\\Cortex\\src\\mcp-server.ts"]
  }
}
```

## Comandos CLI

```bash
# Agregar
bun run dist/cli.js add -c "Content" -t "fact" -s "source"

# Tipos: fact, decision, code, config, note

# Buscar
bun run dist/cli.js search "query"

# Listar
bun run dist/cli.js list
bun run dist/cli.js list --type decision

# Stats
bun run dist/cli.js stats

# Delete
bun run dist/cli.js delete 5
```

## Arquitectura

```
src/
  storage.ts      # SQLite (bun:sqlite)
  mcp-server.ts   # MCP server 
  cli.ts          # CLI
dist/             # Build output
  cli.js
  mcp-server.js

DB: ~/.cortex/memories.db
```

## Troubleshooting

### Claude no encuentra el servidor

1. Verifica que la ruta en `claude_desktop_config.json` sea ABSOLUTA
2. Verifica que Bun esté instalado: `bun --version`
3. Verifica que el build existe: `ls dist/mcp-server.js`
4. Reinicia Claude Desktop completamente

### "No se encuentra el módulo"

```bash
# Re-instalar dependencias
rm -rf node_modules bun.lockb
bun install
bun run build
```

### Database path issues

Por defecto usa `~/.cortex/memories.db`. Para ver la ruta:
```bash
bun run dist/cli.js info
```

## 📚 Documentation

- [**Quick Start**](./docs/getting-started/quick-start.md) - Get started in 5 minutes
- [**Installation Guide**](./docs/getting-started/installation.md) - Detailed setup instructions
- [**Examples**](./docs/getting-started/examples.md) - Real-world use cases
- [**Architecture**](./docs/architecture/) - Technical deep-dive
- [**Contributing**](./CONTRIBUTING.md) - How to contribute
- [**Vision**](./docs/VISION.md) - Project vision and roadmap

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Start for Contributors

```bash
git clone https://github.com/AngelAlexQC/Cortex.git
cd Cortex
bun install
bun run build
bun test
```

### Development

- **Report Bugs:** [Create an issue](https://github.com/AngelAlexQC/Cortex/issues/new/choose)
- **Suggest Features:** [Open a feature request](https://github.com/AngelAlexQC/Cortex/issues/new/choose)
- **Ask Questions:** [Start a discussion](https://github.com/AngelAlexQC/Cortex/discussions)

## 📋 Roadmap

See our [Vision Document](./docs/VISION.md) for the full roadmap.

**Current (v0.1.x):**
- ✅ Core storage with SQLite
- ✅ CLI tool
- ✅ MCP server
- ✅ VS Code extension
- ✅ Project isolation

**Next (v0.2.x):**
- 🚧 Semantic search with embeddings
- 🚧 Auto-learning from git history
- 🚧 VS Code extension on marketplace
- 🚧 Global CLI installation

**Future:**
- 📋 Cloud sync (optional)
- 📋 Team collaboration
- 📋 Analytics dashboard

## 📄 License

[MIT License](./LICENSE) - feel free to use this project commercially.

## 🔗 Resources

- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh)

---

**Built with ❤️ for the AI-powered development era**

*Star ⭐ this repo if you find it useful!*
