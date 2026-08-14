// Set default timeout for IPv4/IPv6 family auto-selection to avoid long delays
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Memory } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import { getProjectId } from './context';
import { ContextObserver } from './contextObserver';
import type { ContinuityDashboardSnapshot, DashboardTask } from './continuityDashboard';
import { ContinuityMonitor } from './continuityMonitor';
import { registerCortexTools } from './cortexTools';
import { MemoryTreeProvider } from './memoryTreeProvider';
import { MemoryWebviewProvider } from './memoryWebviewProvider';
import { VSCodeModelAdapter } from './providers';
import { MemoryStore } from './storage';
import { CortexTaskProvider } from './taskProvider';
import type { Tool } from './toolScanner';
import { ToolTreeProvider } from './toolTreeProvider';

const execAsync = promisify(exec);

function renderDashboardHandoff(
  snapshot: ContinuityDashboardSnapshot,
  task: DashboardTask
): string {
  const events = snapshot.events.filter((event) => event.taskId === task.id).slice(0, 12);
  const evidence = task.evidence;
  return [
    `# Cortex Handoff: ${task.objective}`,
    '',
    `- Task: \`${task.id}\``,
    `- Status: **${task.status}**`,
    `- Agent: ${task.actor?.harness ?? 'unknown'}${task.actor?.model ? ` (${task.actor.model})` : ''}`,
    `- Repository: ${task.repository.branch ?? 'unknown branch'} @ ${task.repository.commit ?? 'unknown commit'}`,
    '',
    '## Evidence health',
    '',
    `- Current: ${evidence.current}`,
    `- Verified: ${evidence.verified}`,
    `- Needs review: ${evidence.unverified}`,
    `- Failed: ${evidence.failed}`,
    `- Conflicts: ${evidence.conflicts}`,
    '',
    '## Recent activity',
    '',
    events.length > 0
      ? events
          .map((event) => `- **${event.type}** — ${event.summary} _(status: ${event.status})_`)
          .join('\n')
      : '- No activity recorded.',
    '',
    '## Next safe action',
    '',
    task.status === 'blocked'
      ? '- Resolve the blocker and verify the repository before continuing.'
      : task.status === 'waiting'
        ? '- Inspect the latest event and resume only after confirming the current branch and commit.'
        : '- Continue from the latest event and capture the next high-signal evidence.',
    '',
    '> Generated locally by Cortex. Re-check repository state before trusting stale claims.',
    '',
  ].join('\n');
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log('[Cortex] Private Context Infrastructure initializing...');

    // --- MCP Configuration & Onboarding ---
    const serverPath = context.asAbsolutePath(join('dist', 'mcp-server.js'));

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.configureMcp', async () => {
        try {
          const config = vscode.workspace.getConfiguration('mcp.servers');
          await config.update(
            'cortex',
            { command: 'node', args: [serverPath] },
            vscode.ConfigurationTarget.Global
          );
          vscode.window.showInformationMessage(
            '✅ Cortex MCP Server configured (Local Bundle)! Please reload window.'
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to configure MCP: ${error}`);
        }
      })
    );

    // Auto-repair: Configure if missing or path incorrect
    // Auto-repair: Configure if missing or path incorrect
    const mcpConfig = vscode.workspace.getConfiguration('mcp.servers');
    const existingConfig = mcpConfig.get<Record<string, unknown>>('cortex');
    // We check if it exists AND if it points to the correct bundled file (handle updates)
    if (
      !existingConfig ||
      (Array.isArray(existingConfig.args) && existingConfig.args[0] !== serverPath)
    ) {
      // We only auto-update if it's missing or looks like an old auto-config.
      // User might have custom config, so be careful.
      // But for "bunx" vs "bundled", we want to force bundled for reliability?
      // Let's assume if command is 'npx' or 'bunx', we overwrite. If command is 'node' and diff path, we overwrite.
      // If command is other, maybe user custom?
      if (
        !existingConfig ||
        existingConfig.command === 'npx' ||
        (existingConfig.command === 'node' &&
          Array.isArray(existingConfig.args) &&
          existingConfig.args[0] !== serverPath)
      ) {
        vscode.commands.executeCommand('cortex.configureMcp');
      }
    }

    // --- Onboarding Logic ---
    const isConfigured = context.globalState.get<boolean>('cortex.configured');
    if (!isConfigured) {
      // 2. Offer to configure other editors
      const selection = await vscode.window.showInformationMessage(
        'Would you like to auto-configure Cortex for other editors (Cursor, Claude, Windsurf)?',
        'Yes, Configure All',
        'Not now'
      );

      if (selection === 'Yes, Configure All') {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Configuring Cortex globally...',
            cancellable: false,
          },
          async () => {
            try {
              // Try to run bunx cortex-cli install --global
              // Using bunx to avoid prompts and force install if needed
              // we WANT it to install/run.
              await execAsync('bunx @ecuabyte/cortex-cli install --global');
              vscode.window.showInformationMessage(
                '🎉 Cortex configured for all detected editors!'
              );
            } catch (error: unknown) {
              console.error('Failed to run global install:', error);

              // Second attempt without --global (might be permission issue)
              try {
                await execAsync('bunx @ecuabyte/cortex-cli install');
                vscode.window.showInformationMessage(
                  '✅ Cortex configured for your project editors.'
                );
              } catch (fallbackError) {
                console.error('Failed to run local install:', fallbackError);
                vscode.window.showErrorMessage(
                  `Failed to run global configuration: ${error instanceof Error ? error.message : error}. Please run \`bunx @ecuabyte/cortex-cli install\` manually in your terminal.`
                );
              }
            }
          }
        );
      }

      // Mark as configured so we don't prompt again
      await context.globalState.update('cortex.configured', true);
    }
    // --------------------------------

    // Initialize memory store
    console.log('[Cortex] Initializing MemoryStore...');

    // Get project ID for isolation
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let projectId: string | undefined;

    if (workspaceFolder) {
      try {
        projectId = await getProjectId(workspaceFolder.uri);
        console.log(`[Cortex] Active Project ID: ${projectId}`);
      } catch (e) {
        console.error('[Cortex] Failed to get project ID:', e);
      }
    }

    const store = new MemoryStore(undefined, context.extensionPath, projectId);

    // Initialize context observer
    console.log('[Cortex] Initializing ContextObserver...');
    const observer = new ContextObserver(store);
    context.subscriptions.push(observer);

    // Register tree view providers
    console.log('[Cortex] Registering Tree Providers...');
    const treeProvider = new MemoryTreeProvider(store);
    vscode.window.registerTreeDataProvider('cortex.memoryTree', treeProvider);

    const toolTreeProvider = new ToolTreeProvider();
    vscode.window.registerTreeDataProvider('cortex.toolsTree', toolTreeProvider);

    // Register task provider for native VS Code task integration
    console.log('[Cortex] Registering Task Provider...');
    const taskProvider = new CortexTaskProvider();
    context.subscriptions.push(
      vscode.tasks.registerTaskProvider(CortexTaskProvider.type, taskProvider)
    );

    // Register webview provider
    console.log('[Cortex] Registering Webview Provider...');
    const webviewProvider = new MemoryWebviewProvider(context.extensionUri, store);

    // Register Language Model Tools for Copilot integration
    console.log('[Cortex] Registering Language Model Tools...');
    registerCortexTools(context, store, () => treeProvider.refresh());

    // Initialize dashboard webview (singleton)
    console.log('[Cortex] Initializing Dashboard...');
    const { AIScanWebview } = await import('./aiScanWebview');
    const dashboardWebview = new AIScanWebview(context.extensionUri, context);
    const continuityMonitor = new ContinuityMonitor({ extensionPath: context.extensionPath });
    const workspaceIdentity = () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      return {
        name: folder?.name ?? 'Workspace',
        root: folder?.uri.fsPath ?? '',
      };
    };
    const refreshContinuity = async () => {
      const snapshot = await continuityMonitor.read(workspaceIdentity());
      dashboardWebview.setContinuitySnapshot(snapshot);
    };

    context.subscriptions.push(
      vscode.window.registerWebviewPanelSerializer('cortexAIScan', {
        async deserializeWebviewPanel(panel) {
          dashboardWebview.attach(panel, context);
          await refreshContinuity();
        },
      })
    );

    // --- Connect Components (Iron Man Wiring) ---
    observer.setWebview(dashboardWebview);

    // Sync dashboard state with database - clear stale data if DB is empty
    try {
      const stats = await store.stats();
      if (stats.total === 0) {
        console.log('[Cortex] Database empty, clearing stale dashboard state...');
        dashboardWebview.clearState();
      }
    } catch (e) {
      console.warn('[Cortex] Failed to sync dashboard state with database:', e);
      // If we can't read the DB, clear state to be safe
      dashboardWebview.clearState();
    }

    // Stream new memories to dashboard
    context.subscriptions.push(
      store.onDidAdd((memory) => {
        // Automatically add to the live feed
        dashboardWebview.addMemory({ ...memory, tags: memory.tags || [] });
      })
    );

    // Command to open the dashboard
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.openDashboard', () => {
        dashboardWebview.show(context);
        void refreshContinuity();
      })
    );

    void refreshContinuity();
    const continuityTimer = setInterval(() => {
      void refreshContinuity();
    }, 1500);
    context.subscriptions.push({ dispose: () => clearInterval(continuityTimer) });

    // Register commands
    console.log('[Cortex] Registering Commands...');
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.addMemory', async () => {
        try {
          const content = await vscode.window.showInputBox({
            prompt: 'Enter memory content',
            placeHolder: 'What do you want to remember?',
          });

          if (!content) return;

          const typeOptions: vscode.QuickPickItem[] = [
            { label: 'fact', description: 'A factual piece of information' },
            { label: 'decision', description: 'An architectural or design decision' },
            { label: 'code', description: 'A code pattern or snippet' },
            { label: 'config', description: 'Configuration information' },
            { label: 'note', description: 'General note or observation' },
          ];

          const typeChoice = await vscode.window.showQuickPick(typeOptions, {
            placeHolder: 'Select memory type',
          });

          if (!typeChoice) return;

          const source = await vscode.window.showInputBox({
            prompt: 'Enter source',
            placeHolder: 'e.g., file path, URL, conversation',
            value: vscode.window.activeTextEditor?.document.fileName || 'manual',
          });

          if (!source) return;

          const id = await store.add({
            content,
            type: typeChoice.label as Memory['type'],
            source,
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
        try {
          const query = await vscode.window.showInputBox({
            prompt: 'Search memories',
            placeHolder: 'Enter search query',
          });

          if (!query) return;

          const results = await store.search(query, { limit: 20 });

          if (results.length === 0) {
            vscode.window.showInformationMessage('No memories found');
            return;
          }

          const items = results.map((m) => ({
            label: `[${m.type}] ${m.content}`,
            description: m.source,
            memory: m,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Found ${results.length} memories`,
          });

          if (selected) {
            webviewProvider.showMemory(selected.memory);
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Error searching memories: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.refreshTree', () => {
        treeProvider.refresh();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'cortex.deleteMemory',
        async (item: { memory?: { id: number; content: string } }) => {
          try {
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
          } catch (error) {
            vscode.window.showErrorMessage(`Error deleting memory: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.viewMemory', (item: { memory?: Memory }) => {
        if (item?.memory) {
          webviewProvider.showMemory(item.memory);
        }
      })
    );

    // Tool commands - execute via VS Code task system
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.runTool', async (tool: Tool) => {
        try {
          if (!tool?.command) return;

          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) return;

          // Create and execute task using VS Code's native task system
          const task = new vscode.Task(
            { type: 'cortex', tool: tool.name, category: tool.category, command: tool.command },
            workspaceFolder,
            `${tool.category}: ${tool.name}`,
            'Cortex',
            new vscode.ShellExecution(tool.command)
          );

          await vscode.tasks.executeTask(task);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to run tool: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.refreshTools', () => {
        toolTreeProvider.refresh();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.toggleObserver', () => {
        observer.toggle();
      })
    );

    // Command to save selected text as memory
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.addSelectionAsMemory', async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
          }

          const selection = editor.selection;
          const selectedText = editor.document.getText(selection);

          if (!selectedText || selectedText.trim().length === 0) {
            vscode.window.showWarningMessage('No text selected');
            return;
          }

          const typeOptions: vscode.QuickPickItem[] = [
            { label: 'code', description: 'A code pattern or snippet' },
            { label: 'fact', description: 'A factual piece of information' },
            { label: 'decision', description: 'An architectural or design decision' },
            { label: 'config', description: 'Configuration information' },
            { label: 'note', description: 'General note or observation' },
          ];

          const typeChoice = await vscode.window.showQuickPick(typeOptions, {
            placeHolder: 'Select memory type for selection',
          });

          if (!typeChoice) return;

          const source = vscode.workspace.asRelativePath(editor.document.uri);
          const lineInfo = `L${selection.start.line + 1}-${selection.end.line + 1}`;

          const id = await store.add({
            content: selectedText,
            type: typeChoice.label as Memory['type'],
            source: `${source}:${lineInfo}`,
          });

          vscode.window.showInformationMessage(`Selection saved as memory (ID: ${id})`);
          treeProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(`Error saving selection: ${error}`);
        }
      })
    );

    // Command to scan project for context
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.scanProject', async () => {
        try {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
          }

          const scanPath = workspaceFolder.uri.fsPath;

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Cortex: Scanning project...',
              cancellable: false,
            },
            async (progress) => {
              progress.report({ message: 'Initializing scanner...' });

              // Use local scanner (no bun:sqlite dependency)
              const { ProjectScanner } = await import('./projectScanner');
              const scanner = new ProjectScanner();

              progress.report({ message: 'Scanning files...' });

              const result = await scanner.scan({ path: scanPath });

              progress.report({ message: `Saving ${result.memories.length} memories...` });

              // Save memories
              let savedCount = 0;
              for (const memory of result.memories) {
                try {
                  await store.add({
                    content: memory.content,
                    type: memory.type as Memory['type'],
                    source: memory.source,
                    tags: memory.tags,
                  });
                  savedCount++;
                } catch (e) {
                  console.error('[Cortex] Failed to save memory:', e);
                }
              }

              // Refresh tree view
              treeProvider.refresh();

              // Show results
              const byType = Object.entries(result.summary.byType)
                .filter(([, count]) => (count as number) > 0)
                .map(([type, count]) => `${type}: ${count}`)
                .join(', ');

              vscode.window.showInformationMessage(
                `✓ Scan complete! Saved ${savedCount} memories (${byType})`
              );
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Error scanning project: ${error}`);
        }
      })
    );

    // Command to scan project with AI (intelligent analysis)
    const startProjectAnalysis = async (mode: 'startup' | 'manual' = 'manual') => {
      const interactive = mode === 'manual';
      try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          if (interactive) vscode.window.showWarningMessage('No workspace folder open');
          return;
        }

        const scanPath = workspaceFolder.uri.fsPath;

        if (interactive) {
          dashboardWebview.show(context);
          dashboardWebview.clearState();
          dashboardWebview.setStatus('analyzing', 'Starting new analysis session...');
        }

        // Update tree status
        treeProvider.setAnalysisStatus('running');

        if (interactive)
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Cortex: AI-powered scan...',
              cancellable: true,
            },
            async (progress, token) => {
              progress.report({ message: 'Analyzing with AI...' });

              progress.report({ message: 'Analyzing with AI...' });

              const { scanProjectWithAI } = await import('./aiScanner');

              // Pass refresh callback for real-time tree updates
              const result = await scanProjectWithAI(
                scanPath,
                token,
                store,
                dashboardWebview,
                (_memory, count) => {
                  progress.report({ message: `Saved ${count} memories...` });
                },
                () => treeProvider.refresh(),
                context.secrets, // For Gemini API BYOK
                { mode, accessInformation: context.languageModelAccessInformation }
              );

              // Final refresh to ensure tree is up-to-date and status is idle
              treeProvider.setAnalysisStatus('idle');

              vscode.window.showInformationMessage(
                `✓ AI scan complete! Analyzed ${result.filesAnalyzed} files, saved ${result.savedCount} memories in real-time.`
              );
            }
          );
        else {
          const { scanProjectWithAI } = await import('./aiScanner');
          await scanProjectWithAI(
            scanPath,
            new vscode.CancellationTokenSource().token,
            store,
            dashboardWebview,
            undefined,
            () => treeProvider.refresh(),
            context.secrets,
            { mode: 'startup', accessInformation: context.languageModelAccessInformation }
          );
        }
        dashboardWebview.hydrate();
        treeProvider.setAnalysisStatus('idle');
      } catch (error) {
        if (interactive) dashboardWebview.setStatus('error', `Scan failed: ${error}`);
        treeProvider.setAnalysisStatus('idle');
        if (interactive) vscode.window.showErrorMessage(`Error scanning project: ${error}`);
        else console.warn('[Cortex] Silent startup scan skipped:', error);
      }
    };

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.scanWithAI', startProjectAnalysis)
    );

    // Listen for dashboard messages (Start Scan button)
    // biome-ignore lint/suspicious/noExplicitAny: Message payload is loosely typed
    dashboardWebview.onDidReceiveMessage(async (message: any) => {
      // Normalize payload (support 'data' wrapper from new webview)
      const payload = message.data || message;

      if (message.type === 'ready') {
        try {
          console.log('[Cortex] Dashboard ready, initiating hydration...');

          // Initial hydration
          dashboardWebview.hydrate();

          // Push system status
          const dbStatus = store.isInitialized();
          console.log(`[Cortex] DB Status: ${JSON.stringify(dbStatus)}`);

          dashboardWebview.postMessage({
            type: 'systemStatus',
            mcp: 'ready',
            db: dbStatus.ready ? 'ready' : 'error',
          });

          await refreshContinuity();

          // If dashboard has no memories but DB does, fetch and populate
          const stats = await store.stats();
          if (stats.total > 0 && dashboardWebview.getMemories().length === 0) {
            console.log(
              `[Cortex] Dashboard empty but DB has ${stats.total} memories. Loading initial batch...`
            );
            const memories = await store.list({});
            for (const m of memories.reverse()) {
              dashboardWebview.addMemory({ ...m, tags: m.tags || [] });
            }
          }
        } catch (e) {
          console.error('[Cortex] Error processing dashboard ready:', e);
          dashboardWebview.postMessage({
            type: 'systemStatus',
            mcp: 'error',
            db: 'error',
          });
        }
      }

      if (message.type === 'refreshDashboard') {
        await refreshContinuity();
      }

      if (message.type === 'copyEvidence') {
        await vscode.env.clipboard.writeText(JSON.stringify(payload, null, 2));
        vscode.window.showInformationMessage('Evidence copied to clipboard.');
      }

      if (
        message.type === 'copyHandoff' ||
        message.type === 'openHandoff' ||
        message.type === 'resumeTask'
      ) {
        const snapshot = dashboardWebview.getContinuitySnapshot();
        if (!snapshot) {
          vscode.window.showWarningMessage('No continuity state is available yet.');
          return;
        }
        const task =
          snapshot.tasks.find((item) => item.id === snapshot.activeTaskId) ?? snapshot.tasks[0];
        if (!task) {
          vscode.window.showInformationMessage('No active task is available for a handoff.');
          return;
        }
        const handoff = renderDashboardHandoff(snapshot, task);
        if (message.type === 'openHandoff') {
          const document = await vscode.workspace.openTextDocument({
            language: 'markdown',
            content: handoff,
          });
          await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
          return;
        }
        await vscode.env.clipboard.writeText(handoff);
        vscode.window.showInformationMessage(
          message.type === 'resumeTask'
            ? 'Handoff copied. Paste it into the next agent to resume safely.'
            : 'Handoff copied to clipboard.'
        );
      }

      if (message.type === 'startScan') {
        startProjectAnalysis();
      }

      if (message.type === 'analyzeArea') {
        const areaName = payload.areaName || message.areaName;
        if (!areaName) return;

        // Find the area
        const area = dashboardWebview.getArea(areaName);
        if (!area) {
          vscode.window.showErrorMessage(`Area not found: ${message.areaName}`);
          return;
        }

        // Trigger analysis
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Analyzing Area: ${area.name}...`,
            cancellable: true,
          },
          async (_progress, token) => {
            try {
              dashboardWebview.updateAreaStatus(area.name, 'analyzing');

              const { analyzeAreaWithRealTimeSave, getOutputChannel } = await import('./aiScanner');

              // Select model (simplified: use default or ask user if this was a rigorous flow, but for now assuming previous model or simple pick)
              // For interactive mode, we'll try to get a model. If fail, show error.
              const models = await vscode.lm.selectChatModels({ family: 'gpt-4' }); // Prefer GPT-4 class
              let model = models[0];
              if (!model) {
                const allModels = await vscode.lm.selectChatModels({});
                model = allModels[0];
              }
              if (!model) throw new Error('No Language Model available.');

              // We need a dummy root path or the real one.
              // Assuming single root workspace for now as per startProjectAnalysis
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) throw new Error('No workspace open');

              // Mock context for the single area (we don't have full context here easily without passing it around)
              // But analyzeAreaWithRealTimeSave needs 'context'.
              // We'll reconstruct a minimal context or retrieve it if possible.
              // For now, we'll pass a basic context object derived from the area itself + dashboard info.
              // biome-ignore lint/suspicious/noExplicitAny: Minimal context construction
              const minimalContext: any = {
                projectName: dashboardWebview.getProjectContext()?.name || 'Unknown',
                techStack: dashboardWebview.getProjectContext()?.techStack || [],
                areas: [area],
              };

              await analyzeAreaWithRealTimeSave(
                new VSCodeModelAdapter(model),
                workspaceFolder.uri.fsPath,
                area,
                minimalContext,
                getOutputChannel(),
                dashboardWebview,
                token,
                async (memory) => {
                  await store.add({
                    content: memory.content,
                    // biome-ignore lint/suspicious/noExplicitAny: Type matching
                    type: memory.type as any,
                    source: memory.source,
                    tags: memory.tags,
                  });
                  // Tree refresh for real-time memory list updates?
                  // Ideally we fire an event or call treeProvider directly if in scope.
                  treeProvider.refresh();
                }
              );

              dashboardWebview.updateAreaStatus(area.name, 'complete');
              treeProvider.refresh();
            } catch (error) {
              console.error('Area analysis failed:', error);
              dashboardWebview.updateAreaStatus(area.name, 'error');
              vscode.window.showErrorMessage(`Failed to analyze area: ${error}`);
            }
          }
        );
      }

      // Handle "Show Memory" from dashboard
      if (message.type === 'showMemory' && payload.id) {
        const memory = await store.get(payload.id);
        if (memory) {
          webviewProvider.showMemory(memory);
        }
      }

      // Handle "Filter" from dashboard
      if (message.type === 'filter') {
        console.log('[Cortex] Dashboard filter requested:', payload);
        vscode.commands.executeCommand('cortex.memoryTree.focus');

        if (typeof payload === 'object') {
          if (payload.area) {
            // Filter by tag matching the area name (slugified as in aiScanner.ts)
            const areaTag = payload.area.toLowerCase().replace(/\s+/g, '-');
            treeProvider.setFilter({ tag: areaTag });
            vscode.window.setStatusBarMessage(
              `Dashboard: Filtering by Area: ${payload.area} (tag: ${areaTag})`,
              3000
            );
          } else if (payload.type) {
            treeProvider.setFilter({ type: payload.type });
            vscode.window.setStatusBarMessage(`Dashboard: Filtering by ${payload.type}`, 3000);
          }
        } else if (typeof payload === 'string') {
          const filterType = payload;
          treeProvider.setFilter({ type: filterType });
          vscode.window.setStatusBarMessage(`Dashboard: Filtering by ${filterType}`, 3000);
        }
      }
    });

    // Command to clear filter
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.clearFilter', () => {
        treeProvider.setFilter(undefined);
      })
    );

    // Command to show specific item in dashboard (from CodeLens)
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'cortex.showDashboardItem',
        async (args: { type: string; id?: string }) => {
          dashboardWebview.show(context);
          // Wait a bit for hydrate
          setTimeout(() => {
            dashboardWebview.postMessage({ type: 'highlightItem', data: args });
          }, 500);
        }
      )
    );

    // Reset Extension - Clear all API keys and settings
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.resetExtension', async () => {
        const confirm = await vscode.window.showWarningMessage(
          '⚠️ This will clear all stored API keys and reset Cortex settings. Continue?',
          { modal: true },
          'Reset Everything',
          'Cancel'
        );

        if (confirm !== 'Reset Everything') return;

        try {
          // Clear secret storage (API keys)
          const secretKeys = [
            'cortex.geminiApiKey',
            'cortex.openaiApiKey',
            'cortex.anthropicApiKey',
            'cortex.mistralApiKey',
            'cortex.deepseekApiKey',
          ];

          for (const key of secretKeys) {
            await context.secrets.delete(key);
          }

          // Clear API keys from settings
          const cortexConfig = vscode.workspace.getConfiguration('cortex');
          await cortexConfig.update('gemini.apiKey', undefined, vscode.ConfigurationTarget.Global);
          await cortexConfig.update('openai.apiKey', undefined, vscode.ConfigurationTarget.Global);
          await cortexConfig.update(
            'anthropic.apiKey',
            undefined,
            vscode.ConfigurationTarget.Global
          );
          await cortexConfig.update('mistral.apiKey', undefined, vscode.ConfigurationTarget.Global);
          await cortexConfig.update(
            'deepseek.apiKey',
            undefined,
            vscode.ConfigurationTarget.Global
          );

          // Reset global state
          await context.globalState.update('cortex.configured', undefined);
          await context.globalState.update('cortex.dashboardOpened', undefined);

          vscode.window.showInformationMessage('✅ Cortex reset complete. API keys cleared.');

          const reload = await vscode.window.showInformationMessage(
            'Reload window to apply changes?',
            'Reload Now',
            'Later'
          );

          if (reload === 'Reload Now') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to reset: ${error}`);
        }
      })
    );

    // Network Diagnostics Command
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.debugNetwork', async () => {
        try {
          const { NetworkDiagnostics } = await import('./diagnostics');
          const diagnostics = new NetworkDiagnostics();

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Cortex: Running network diagnostics...',
              cancellable: false,
            },
            async () => {
              await diagnostics.runDiagnostics();
            }
          );

          vscode.window.showInformationMessage(
            'Diagnostics complete. Check "Cortex Debug" output channel.'
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Diagnostics failed: ${error}`);
        }
      })
    );

    // Helper to install VSIX (Developer Convenience)
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.installVSIX', async (uri: vscode.Uri) => {
        // If triggered from command palette, ask for file
        if (!uri) {
          const selection = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            filters: { VSIX: ['vsix'] },
            title: 'Select VSIX to Install',
          });
          if (selection?.[0]) uri = selection[0];
        }

        if (uri) {
          // Use terminal to execute install (visual feedback)
          const terminal = vscode.window.createTerminal('Cortex Installer');
          terminal.show();
          terminal.sendText(`code --install-extension "${uri.fsPath}" --force`);

          const selection = await vscode.window.showInformationMessage(
            'Installing VSIX... Reload window to apply changes.',
            'Reload Window'
          );
          if (selection === 'Reload Window') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        }
      })
    );

    // --- Auto-Scan Project on Startup ---
    // Only verify if requested AND no memories exist (fresh start)
    const config = vscode.workspace.getConfiguration('cortex');
    if (config.get<boolean>('autoScanOnStartup', true)) {
      setTimeout(async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          // Check if we already have context
          try {
            const stats = await store.stats();
            if (stats.total === 0) {
              console.log(
                '[Cortex] No memories found. Triggering intelligent auto-scan on startup...'
              );
              void startProjectAnalysis('startup');
            } else {
              console.log(`[Cortex] Startup scan skipped: ${stats.total} memories found.`);
            }
          } catch (e) {
            console.error('[Cortex] Failed to check memory stats on startup:', e);
          }
        }
      }, 1500); // Small delay to let VS Code settle
    }
  } catch (error) {
    console.error('Failed to activate Cortex extension:', error);
    vscode.window.showErrorMessage(
      `Cortex extension failed to start. Check terminal logs for details. Error: ${error}`
    );
  }
}

export function deactivate() {
  console.log('Cortex Memory extension deactivated');
}
