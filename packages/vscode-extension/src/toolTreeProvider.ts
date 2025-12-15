import * as vscode from 'vscode';
import { type Tool, ToolScanner } from './toolScanner';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  npm: { label: 'npm Scripts', icon: 'package' },
  make: { label: 'Makefile', icon: 'tools' },
  docker: { label: 'Docker', icon: 'server-environment' },
  script: { label: 'Scripts', icon: 'terminal' },
};

export class ToolTreeProvider implements vscode.TreeDataProvider<ToolTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ToolTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cachedTools: Map<string, Tool[]> = new Map();
  private currentWorkspacePath: string | null = null;

  refresh(): void {
    this.cachedTools.clear();
    this.currentWorkspacePath = null;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ToolTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ToolTreeItem): Promise<ToolTreeItem[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      console.log('[Cortex] No workspace folder found');
      return [new ToolTreeItem('No workspace open', '', vscode.TreeItemCollapsibleState.None)];
    }

    const workspacePath = workspaceFolder.uri.fsPath;
    console.log('[Cortex] Workspace path:', workspacePath);

    // Root level - show categories
    if (!element) {
      // Re-scan if workspace changed or cache is empty
      if (this.currentWorkspacePath !== workspacePath || this.cachedTools.size === 0) {
        console.log('[Cortex] Scanning for tools...');
        const scanner = new ToolScanner(workspacePath);
        const result = await scanner.scan();
        this.cachedTools = result.categories;
        this.currentWorkspacePath = workspacePath;
        console.log('[Cortex] Found categories:', Array.from(this.cachedTools.keys()));
        console.log('[Cortex] Total tools:', result.tools.length);
      }

      const categories: ToolTreeItem[] = [];

      for (const [category, tools] of this.cachedTools) {
        if (tools.length === 0) continue;

        const config = CATEGORY_LABELS[category] || { label: category, icon: 'folder' };
        const item = new ToolTreeItem(
          config.label,
          `${tools.length} tools`,
          vscode.TreeItemCollapsibleState.Expanded,
          category
        );
        item.iconPath = new vscode.ThemeIcon(config.icon);
        categories.push(item);
      }

      if (categories.length === 0) {
        console.log('[Cortex] No tools detected in workspace');
        return [
          new ToolTreeItem(
            'No tools detected',
            'Add package.json, Makefile, etc.',
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      return categories;
    }

    // Show tools for category
    const tools = this.cachedTools.get(element.category || '') || [];
    return tools.map((tool) => {
      const item = new ToolTreeItem(
        tool.name,
        tool.source,
        vscode.TreeItemCollapsibleState.None,
        'tool'
      );
      item.tool = tool;
      item.contextValue = 'tool';
      item.iconPath = new vscode.ThemeIcon('play');
      item.command = {
        command: 'cortex.runTool',
        title: 'Run Tool',
        arguments: [tool],
      };
      return item;
    });
  }
}

export class ToolTreeItem extends vscode.TreeItem {
  tool?: Tool;
  category?: string;

  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    category?: string
  ) {
    super(label, collapsibleState);
    this.category = category;
    this.tooltip = category === 'tool' ? `Run: ${this.label}` : this.label;
  }
}
