import * as vscode from 'vscode';
import { MemoryTreeProvider } from './memoryTreeProvider';
import { MemoryWebviewProvider } from './memoryWebviewProvider';
import { MemoryStore } from './storage';

export function activate(context: vscode.ExtensionContext) {
  console.log('Cortex Memory extension is now active');

  // Initialize memory store
  const store = new MemoryStore();

  // Register tree view provider
  const treeProvider = new MemoryTreeProvider(store);
  vscode.window.registerTreeDataProvider('cortex.memoryTree', treeProvider);

  // Register webview provider
  const webviewProvider = new MemoryWebviewProvider(context.extensionUri, store);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('cortex.addMemory', async () => {
      const content = await vscode.window.showInputBox({
        prompt: 'Enter memory content',
        placeHolder: 'What do you want to remember?'
      });
      
      if (!content) return;

      const typeOptions: vscode.QuickPickItem[] = [
        { label: 'fact', description: 'A factual piece of information' },
        { label: 'decision', description: 'An architectural or design decision' },
        { label: 'code', description: 'A code pattern or snippet' },
        { label: 'config', description: 'Configuration information' },
        { label: 'note', description: 'General note or observation' }
      ];

      const typeChoice = await vscode.window.showQuickPick(typeOptions, {
        placeHolder: 'Select memory type'
      });

      if (!typeChoice) return;

      const source = await vscode.window.showInputBox({
        prompt: 'Enter source',
        placeHolder: 'e.g., file path, URL, conversation',
        value: vscode.window.activeTextEditor?.document.fileName || 'manual'
      });

      if (!source) return;

      try {
        const id = await store.add({
          content,
          type: typeChoice.label as any,
          source
        });
        vscode.window.showInformationMessage(`Memory added (ID: ${id})`);
        treeProvider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Error adding memory: ${error}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cortex.searchMemories', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search memories',
        placeHolder: 'Enter search query'
      });

      if (!query) return;

      const results = await store.search(query, { limit: 20 });
      
      if (results.length === 0) {
        vscode.window.showInformationMessage('No memories found');
        return;
      }

      const items = results.map(m => ({
        label: `[${m.type}] ${m.content}`,
        description: m.source,
        memory: m
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} memories`
      });

      if (selected) {
        webviewProvider.showMemory(selected.memory);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cortex.refreshTree', () => {
      treeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cortex.deleteMemory', async (item: any) => {
      if (!item?.memory?.id) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete memory "${item.memory.content}"?`,
        'Delete',
        'Cancel'
      );

      if (confirm === 'Delete') {
        await store.delete(item.memory.id);
        vscode.window.showInformationMessage('Memory deleted');
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cortex.viewMemory', (item: any) => {
      if (item?.memory) {
        webviewProvider.showMemory(item.memory);
      }
    })
  );
}

export function deactivate() {
  console.log('Cortex Memory extension deactivated');
}
