# Universal Cortex Setup Guide

Cortex is designed to preserve **verified engineering state and handoffs** across AI-powered development environments. While it has a dedicated [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode), you can also use it with **Cursor**, **Windsurf**, **Claude Code**, **Goose**, **JetBrains**, and **Neovim** via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

The goal is not to capture a user's entire AI history. Cortex records the project, task, evidence, decisions, artifacts, verification, and next steps needed to resume software work safely in another session or agent.

## Native Agent Bridge

For automatic continuity capture inside a repository, run:

```bash
cortex install --project .
```

The installer preserves existing configuration and adds:

- Codex lifecycle hooks in `.codex/hooks.json`;
- an OpenCode plugin in `.opencode/plugins/cortex.ts`; and
- the existing MCP/rules configuration for the supported editors.

The integrations call `cortex bridge ingest`, which writes to the local
ContinuityStore. Events are deduplicated by provider/session/event identity and
redacted before storage. The bridge records durable engineering signals rather
than full prompts, transcripts, or file contents.

To use the bridge with another runtime adapter, provide one JSON event on
stdin:

```bash
echo '{"hook_event_name":"UserPromptSubmit","session_id":"demo","prompt":"Run the API tests","cwd":"/path/to/repo"}' \
  | cortex bridge ingest --provider codex
```

See [ADR 006](architecture/decisions/006-agent-bridge-ingestion.md) for the
contract and design boundaries.

## 🚀 Quick Setup (All Tools)

We provide a utility to generate the configuration for your specific tool.

1.  **Prerequisites**: Install [Bun](https://bun.sh) runtime:
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2.  **Generate Config**:
    Run the following command to get the config block for your tool:
    ```bash
    # For Cursor
    cortex install --editor cursor

    # For Gemini Code Assist (Antigravity)
    cortex install --editor gemini

    # For Claude Desktop
    cortex install --editor claude-desktop
    ```

---

## 🛠 Manual Configuration

If you prefer to configure manually, follow the instructions for your specific tool below.

### 1. Cursor / Windsurf / VSCodium (OpenVSX)

These editors support VS Code extensions but use the [Open VSX Registry](https://open-vsx.org/).

1.  Open the **Extensions** panel.
2.  Search for `Cortex` (or ID: `EcuaByte.cortex-vscode`).
3.  Install **Cortex: AI Memory** published by `EcuaByte`.

**Troubleshooting: Extension not found?**
 In some restricted environments (like corporate networks or older IDE versions), the search might fail.
*   **Solution**: Download the `.vsix` from [GitHub Releases](https://github.com/EcuaByte-lat/Cortex/releases) and drag-and-drop it into the extensions panel.

**Alternative (Native MCP):**
If you want to use the MCP server directly (e.g., for Composer in Cursor):
1.  Open `Cursor Settings` > `General` > `MCP`.
2.  Add a new server:
    *   **Name**: `cortex`
    *   **Type**: `command`
    *   **Command**: `bunx`
    *   **Args**: `@ecuabyte/cortex-mcp-server`
    
### 2. Google IDX

Cortex works natively in Google IDX. Add it to your `.idx/dev.nix` file:

```nix
{ pkgs, ... }: {
  idx = {
    extensions = [
      "EcuaByte.cortex-vscode"
    ];
  };
}
```

*Note: If the extension search fails, you can drag and drop the `.vsix` from our [Releases page](https://github.com/EcuaByte-lat/Cortex/releases).*

### 3. Claude Desktop

To give Claude Desktop access to your project memories:

1.  Open your config file:
    *   **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2.  Add `cortex` to the `mcpServers` object:
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

### 3. JetBrains (IntelliJ, WebStorm, PyCharm)

JetBrains AI Assistant supports MCP (since 2025.2).

1.  Open **Settings/Preferences** > **Tools** > **Model Context Protocol**.
2.  Click **+** to add a server.
3.  Select **stdio** transport.
4.  **Command**: `bunx`
5.  **Args**: `@ecuabyte/cortex-mcp-server`
6.  Restart the AI Assistant if necessary.

### 4. Neovim

Use [`avante.nvim`](https://github.com/yetone/avante.nvim) or similar AI plugins that support MCP.

**Example `avante.nvim` setup:**
```lua
{
  "yetone/avante.nvim",
  opts = {
    -- ... other config
    mcp_servers = {
      cortex = {
        command = "bunx",
        args = { "@ecuabyte/cortex-mcp-server" },
      },
    },
  },
}
```

### 5. Goose / Gemini CLI / Antigravity IDE

**Goose:**
```bash
goose configure mcp add cortex "bunx @ecuabyte/cortex-mcp-server"
```

**Antigravity IDE:**
Antigravity uses `~/.gemini/antigravity/mcp_config.json`.
```bash
# Fastest way:
bunx @ecuabyte/cortex-mcp-server generate-config --target antigravity
```

Or manually add to `~/.gemini/antigravity/mcp_config.json`:
```json
{
  "mcpServers": {
    "cortex": {
      "command": "bunx",
      "args": ["@ecuabyte/cortex-mcp-server"],
      "trust": true,
      "description": "Cortex engineering state and verified handoffs for coding agents"
    }
  }
}
```

**Gemini CLI:**
Gemini CLI uses `~/.gemini/settings.json`.
```bash
bunx @ecuabyte/cortex-mcp-server generate-config --target gemini
```
