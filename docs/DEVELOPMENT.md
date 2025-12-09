# Cortex Development Guide

## Estructura del Proyecto

```
cortex/
├── packages/
│   ├── core/              # @cortex/core - Storage layer
│   │   ├── src/
│   │   │   ├── storage.ts # MemoryStore class (SQLite)
│   │   │   └── index.ts   # Exports públicos
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/               # @cortex/cli - Command-line interface
│   │   ├── src/
│   │   │   └── cli.ts     # Commander.js CLI
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/        # @cortex/mcp-server - MCP protocol server
│   │   ├── src/
│   │   │   └── mcp-server.ts  # MCP SDK integration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── vscode-extension/  # cortex-vscode - VS Code extension
│       ├── src/
│       │   ├── extension.ts           # Activation & commands
│       │   ├── memoryTreeProvider.ts  # TreeView sidebar
│       │   └── memoryWebviewProvider.ts # Webview panel
│       ├── resources/
│       │   └── icon.svg              # Extension icon
│       ├── build.ts                  # Bun build script
│       ├── package.json
│       └── tsconfig.json
│
├── .vscode/
│   ├── launch.json        # Debug configurations
│   ├── tasks.json         # Build tasks
│   └── extensions.json    # Recommended extensions
│
├── build.ts               # Monorepo build orchestrator
├── bunfig.toml           # Bun configuration
├── package.json          # Root workspace config
└── tsconfig.json         # Base TypeScript config
```

## Comandos Disponibles

### Root Level

```bash
# Instalar dependencias (usa Bun workspaces)
bun install

# Construir todos los paquetes en orden
bun run build

# Construir paquetes individuales
bun run build:core
bun run build:cli
bun run build:mcp
bun run build:extension

# Desarrollo
bun run dev:cli        # CLI en modo watch
bun run dev:mcp        # MCP server en modo watch
bun run dev:extension  # Extension en modo watch

# Type checking
bun run typecheck
```

### Por Paquete

```bash
# Core
cd packages/core
bun run build          # Compila a dist/
bun run dev            # Watch mode

# CLI
cd packages/cli
bun run build
bun run dev
bun run src/cli.ts add -c "Test" -t "fact" -s "manual"

# MCP Server
cd packages/mcp-server
bun run build
bun run dev
bun run start          # Ejecuta dist/mcp-server.js

# VS Code Extension
cd packages/vscode-extension
bun run build          # Build con Bun.build()
bun run dev            # Watch mode
bun run package        # Crea .vsix
```

## Desarrollo de la Extensión VS Code

### Opción 1: Debug en VS Code (Recomendado)

1. Abre el proyecto en VS Code
2. Presiona `F5` o usa el panel de Debug
3. Selecciona "Run Extension"
4. Se abrirá una nueva ventana "Extension Development Host"
5. La extensión Cortex aparecerá en la barra lateral

### Opción 2: Build Manual + Instalación

```bash
cd packages/vscode-extension
bun run build
bun run package  # Crea cortex-vscode-0.1.0.vsix
code --install-extension cortex-vscode-0.1.0.vsix
```

### Hot Reload

Para recargar cambios mientras desarrollas:
1. Guarda archivos en `packages/vscode-extension/src/`
2. En Extension Development Host: `Ctrl+R` (Reload Window)
3. O usa `bun run dev` para auto-rebuild

### Debugging

- Puntos de interrupción funcionan en archivos `.ts`
- Console logs aparecen en "Debug Console"
- Errores de extension aparecen en "Output → Cortex Memory"

## Arquitectura de la Extensión

### TreeView Provider (`memoryTreeProvider.ts`)

- Implementa `vscode.TreeDataProvider<MemoryTreeItem>`
- Root level: Muestra categorías (All, Facts, Decisions, etc.)
- Child level: Muestra memories individuales
- Se refresca con `_onDidChangeTreeData.fire()`

### Webview Provider (`memoryWebviewProvider.ts`)

- Crea panel HTML para mostrar detalles de memoria
- Usa VS Code CSS variables para theming
- Se abre en `vscode.ViewColumn.Two`

### Comandos Registrados

| Comando | ID | Descripción |
|---------|-----|-------------|
| Add Memory | `cortex.addMemory` | Input boxes para crear nueva memoria |
| Search Memories | `cortex.searchMemories` | Quick pick con resultados |
| Refresh Tree | `cortex.refreshTree` | Recarga el TreeView |
| Delete Memory | `cortex.deleteMemory` | Elimina memoria (confirmación) |
| View Memory | `cortex.viewMemory` | Abre Webview con detalles |

## Build System (Bun)

### Por Qué Bun

- **50x más rápido** que webpack
- **Native bundler** sin configuración extra
- **Watch mode** integrado
- **Workspaces** nativos (no necesita Lerna)
- **Runtime** para TypeScript directo

### Configuración de Build

#### VS Code Extension (`packages/vscode-extension/build.ts`)

```typescript
await Bun.build({
  entrypoints: ['./src/extension.ts'],
  outdir: './dist',
  target: 'node',        // IMPORTANTE para VS Code
  format: 'cjs',         // IMPORTANTE: CommonJS requerido
  external: ['vscode'],  // IMPORTANTE: vscode no debe bundlearse
  minify: false,
  sourcemap: 'external'
});
```

#### Otros Paquetes

- **Format**: `esm` (módulos ES6)
- **Target**: `node`
- **Minify**: `false` (para debugging)

## Dependencias Workspace

Los paquetes usan referencias workspace:

```json
{
  "dependencies": {
    "@cortex/core": "workspace:*"
  }
}
```

Bun resuelve esto automáticamente al hacer `bun install`.

## Database Schema

SQLite en `~/.cortex/memories.db`:

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  type TEXT CHECK(type IN ('fact','decision','code','config','note')),
  source TEXT NOT NULL,
  tags TEXT,                    -- JSON array
  metadata TEXT,                -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Índices en: `type`, `source`, `created_at`

## Testing

```bash
# Probar CLI
bun --cwd packages/cli run dev add -c "Test memory" -t "fact" -s "test"
bun --cwd packages/cli run dev list
bun --cwd packages/cli run dev search "test"
bun --cwd packages/cli run dev stats

# Probar MCP Server (requiere stdin/stdout)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun run packages/mcp-server/dist/mcp-server.js

# Probar Extension
# F5 en VS Code → Extension Development Host
```

## Troubleshooting

### Error: Cannot find module '@cortex/core'

```bash
# Re-instalar workspace dependencies
rm -rf node_modules packages/*/node_modules
bun install
```

### Extension no aparece en VS Code

- Verifica que `packages/vscode-extension/dist/extension.js` existe
- Revisa "Output → Cortex Memory" para errores
- Intenta `Ctrl+R` en Extension Development Host

### Build falla

```bash
# Limpiar y rebuild
rm -rf packages/*/dist
bun run build
```

### MCP Server no conecta

- Verifica path en `.vscode/mcp.json`
- Usa path absoluto: `C:\\Code\\Cortex\\packages\\mcp-server\\dist\\mcp-server.js`
- Reinicia VS Code completamente

## Next Steps

### Features Pendientes

- [ ] Filtros avanzados en TreeView
- [ ] Edición inline de memories
- [ ] Export/import de memories
- [ ] Tags autocomplete
- [ ] Search con fuzziness
- [ ] Estadísticas visuales (gráficos)
- [ ] Integration tests
- [ ] GitHub Actions CI/CD

### Mejoras de Arquitectura

- [ ] Event emitter para sync entre CLI/MCP/Extension
- [ ] Cache layer para búsquedas
- [ ] Full-text search con FTS5
- [ ] Backup/restore functionality
- [ ] Settings panel en VS Code

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Bun Documentation](https://bun.sh/docs)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [TreeView Guide](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Webview Guide](https://code.visualstudio.com/api/extension-guides/webview)

## License

MIT
