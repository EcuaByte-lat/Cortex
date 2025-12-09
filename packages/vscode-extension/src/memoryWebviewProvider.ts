import * as vscode from 'vscode';
import { Memory, MemoryStore } from './storage';

export class MemoryWebviewProvider {
  private panel?: vscode.WebviewPanel;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly store: MemoryStore
  ) {}

  public showMemory(memory: Memory) {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'cortexMemoryDetail',
        'Memory Detail',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [this.extensionUri]
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    this.panel.webview.html = this.getWebviewContent(memory);
  }

  private getWebviewContent(memory: Memory): string {
    const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString();
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Memory Detail</title>
  <style>
    body {
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .header {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .type-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
      font-size: 12px;
      text-transform: uppercase;
    }
    .content {
      background-color: var(--vscode-textBlockQuote-background);
      padding: 15px;
      border-radius: 4px;
      border-left: 3px solid var(--vscode-textBlockQuote-border);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .metadata {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      font-size: 13px;
    }
    .metadata-label {
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="type-badge">${memory.type}</span>
    <h2 style="margin-top: 10px;">Memory #${memory.id}</h2>
  </div>

  <div class="section">
    <div class="section-title">Content</div>
    <div class="content">${this.escapeHtml(memory.content)}</div>
  </div>

  <div class="section">
    <div class="section-title">Metadata</div>
    <div class="metadata">
      <span class="metadata-label">Source:</span>
      <span>${this.escapeHtml(memory.source)}</span>
      
      <span class="metadata-label">Created:</span>
      <span>${formatDate(memory.createdAt)}</span>
      
      <span class="metadata-label">Updated:</span>
      <span>${formatDate(memory.updatedAt)}</span>
    </div>
  </div>

  ${memory.tags && memory.tags.length > 0 ? `
  <div class="section">
    <div class="section-title">Tags</div>
    <div class="tags">
      ${memory.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
    </div>
  </div>
  ` : ''}
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
