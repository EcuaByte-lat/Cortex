import type { Memory } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import type { MemoryStore } from './storage';

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    MemoryTreeItem | undefined | null | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private analysisStatus: 'idle' | 'running' = 'idle';
  private currentFilter: { type?: string; query?: string; tag?: string } | undefined;

  constructor(private store: MemoryStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setAnalysisStatus(status: 'idle' | 'running') {
    this.analysisStatus = status;
    this.refresh();
  }

  setFilter(filter: { type?: string; query?: string; tag?: string } | undefined) {
    this.currentFilter = filter;
    this.refresh();
  }

  getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]> {
    if (!element) {
      // If filtering, show flat list of matches
      if (this.currentFilter) {
        const type = this.currentFilter.type === 'all' ? undefined : this.currentFilter.type;
        const tag = this.currentFilter.tag;

        // Use store filtering
        const memories = await this.store.list({ type, tag, limit: 100 });

        if (memories.length === 0) {
          return [
            new MemoryTreeItem(
              'No matches found',
              '',
              vscode.TreeItemCollapsibleState.None,
              'info'
            ),
          ];
        }

        const items = memories.map((m) => this.createMemoryItem(m));
        // Add a "Clear Filter" item at the top
        const clearItem = new MemoryTreeItem(
          'Clear Filter',
          `Showing ${memories.length} results`,
          vscode.TreeItemCollapsibleState.None,
          'dashboard_running'
        );
        clearItem.command = { command: 'cortex.clearFilter', title: 'Clear Filter' };

        return [clearItem, ...items];
      }

      // Root level - show dashboard link and categories
      const stats = await this.store.stats();

      const dashboardItem = new MemoryTreeItem(
        'AI Dashboard',
        this.analysisStatus === 'running' ? 'Analysis running...' : 'Open Dashboard',
        vscode.TreeItemCollapsibleState.None,
        this.analysisStatus === 'running' ? 'dashboard_running' : 'dashboard'
      );
      dashboardItem.command = {
        command: 'cortex.openDashboard',
        title: 'Open Dashboard',
      };

      const categories: MemoryTreeItem[] = [
        dashboardItem,
        new MemoryTreeItem(
          'All Memories',
          `${stats.total} total`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'all'
        ),
        new MemoryTreeItem(
          'Facts',
          `${stats.byType.fact || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'fact'
        ),
        new MemoryTreeItem(
          'Decisions',
          `${stats.byType.decision || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'decision'
        ),
        new MemoryTreeItem(
          'Code Patterns',
          `${stats.byType.code || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'code'
        ),
        new MemoryTreeItem(
          'Configs',
          `${stats.byType.config || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'config'
        ),
        new MemoryTreeItem(
          'Notes',
          `${stats.byType.note || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'note'
        ),
      ];
      return categories;
    } else {
      // Show memories for category
      const type = element.category === 'all' ? undefined : element.category;
      const memories = await this.store.list({ type, limit: 100 });
      const items = memories.map((m) => this.createMemoryItem(m));
      return items;
    }
  }

  private createMemoryItem(m: Memory): MemoryTreeItem {
    const item = new MemoryTreeItem(
      m.content.substring(0, 60) + (m.content.length > 60 ? '...' : ''),
      m.source,
      vscode.TreeItemCollapsibleState.None,
      'memory'
    );
    item.memory = m;
    item.contextValue = 'memory';
    item.command = {
      command: 'cortex.viewMemory',
      title: 'View Memory',
      arguments: [item],
    };
    return item;
  }
}

/**
 * Icon mapping for memory types
 */
const MEMORY_TYPE_ICONS: Record<string, { icon: string; color?: string }> = {
  all: { icon: 'library', color: 'charts.purple' },
  dashboard: { icon: 'dashboard', color: 'charts.blue' },
  dashboard_running: { icon: 'loading~spin', color: 'charts.yellow' },
  fact: { icon: 'lightbulb', color: 'charts.yellow' },
  decision: { icon: 'checklist', color: 'charts.green' },
  code: { icon: 'code', color: 'charts.blue' },
  config: { icon: 'gear', color: 'charts.orange' },
  note: { icon: 'note', color: 'charts.foreground' },
  memory: { icon: 'symbol-snippet' },
};

class MemoryTreeItem extends vscode.TreeItem {
  memory?: Memory;
  category?: string;

  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    category?: string
  ) {
    super(label, collapsibleState);
    this.category = category;
    this.tooltip = `${this.label} - ${this.description}`;

    // Apply type-specific icons
    const iconConfig = MEMORY_TYPE_ICONS[category || 'memory'] || MEMORY_TYPE_ICONS.memory;
    this.iconPath = iconConfig.color
      ? new vscode.ThemeIcon(iconConfig.icon, new vscode.ThemeColor(iconConfig.color))
      : new vscode.ThemeIcon(iconConfig.icon);
  }
}
