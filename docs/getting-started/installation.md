# Installation

This guide will help you install and set up Cortex on your system.

## Prerequisites

Before installing Cortex, ensure you have:

- **[Bun](https://bun.sh)** >= 1.0 installed
- **Git** for version control
- **VS Code** (optional, but recommended for the extension)

### Installing Bun

If you don't have Bun installed:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify installation:
```bash
bun --version
```

## Installation Methods

### Option 1: Clone from GitHub (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex

# Install dependencies
bun install

# Build all packages
bun run build

# Verify installation
bun run dev:cli list
```

### Option 2: Install CLI Globally (Coming Soon)

```bash
# Will be available after first release
bun install -g @cortex/cli
```

### Option 3: Use MCP Server Only

If you only need the MCP server for AI tool integration:

```bash
# Clone and build
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install
bun run build:mcp

# Configure in your AI tool (see MCP Integration guide)
```

## Package-Specific Setup

### CLI Tool

```bash
# Test CLI
bun run dev:cli --help

# Add your first memory
bun run dev:cli add -c "Example memory" -t "fact" -s "manual"

# List memories
bun run dev:cli list
```

### MCP Server

```bash
# Start MCP server
bun run dev:mcp

# Configure in AI tools (see guides/mcp-integration.md)
```

### VS Code Extension

1. Open Cortex project in VS Code
2. Press `F5` to launch Extension Development Host
3. The extension will appear in the sidebar (Cortex icon)

For packaging:
```bash
cd packages/vscode-extension
bun run build
# Install .vsix file manually (coming soon to marketplace)
```

## Verification

After installation, verify everything works:

```bash
# Run tests
bun test

# Type checking
bun run typecheck

# Build all packages
bun run build
```

You should see:
```
✓ All tests passing
✓ No type errors
✓ All packages built successfully
```

## Troubleshooting

### Common Issues

**"bun: command not found"**
- Ensure Bun is installed and in your PATH
- Restart your terminal after installation

**"Build failed: Cannot find module"**
- Run `bun install` in the root directory
- Ensure all dependencies are installed

**"Permission denied"**
- On Linux/macOS, you may need to make scripts executable:
  ```bash
  chmod +x packages/*/dist/*.js
  ```

**Database Issues**
- Database is stored in `~/.cortex/memories.db`
- If corrupted, you can delete and start fresh:
  ```bash
  rm -rf ~/.cortex/memories.db
  ```

## Next Steps

- [Quick Start Guide](./quick-start.md) - Start using Cortex
- [CLI Usage](../guides/cli-usage.md) - Learn CLI commands
- [MCP Integration](../guides/mcp-integration.md) - Connect to AI tools
- [VS Code Extension](../guides/vscode-extension.md) - Use visual interface

## Updating

To update to the latest version:

```bash
cd Cortex
git pull origin main
bun install
bun run build
```

## Uninstalling

To remove Cortex:

```bash
# Remove the repository
rm -rf Cortex

# Remove user data (optional)
rm -rf ~/.cortex

# If installed globally (future)
bun remove -g @cortex/cli
```

---

**Questions?** Check the [FAQ](../troubleshooting/faq.md) or [open an issue](https://github.com/EcuaByte-lat/Cortex/issues).
