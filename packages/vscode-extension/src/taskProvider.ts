import * as vscode from 'vscode';

import { type Tool, ToolScanner } from './toolScanner';

interface CortexTaskDefinition extends vscode.TaskDefinition {
  tool: string;
  category: string;
  command: string;
}

/**
 * Provides tasks for detected project tools using VS Code's native Task API.
 * This integrates with VS Code's task system (Terminal > Run Task).
 */
export class CortexTaskProvider implements vscode.TaskProvider {
  static readonly type = 'cortex';

  private tasksPromise: Promise<vscode.Task[]> | undefined;
  private fileWatcher: vscode.FileSystemWatcher | undefined;

  constructor() {
    // Watch for changes to package.json, Makefile, etc.
    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    const pattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders?.[0] || '',
      '{package.json,Makefile,docker-compose.yml,docker-compose.yaml,compose.yml,compose.yaml}'
    );

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.fileWatcher.onDidChange(() => this.invalidateCache());
    this.fileWatcher.onDidCreate(() => this.invalidateCache());
    this.fileWatcher.onDidDelete(() => this.invalidateCache());
  }

  private invalidateCache(): void {
    this.tasksPromise = undefined;
  }

  public provideTasks(): Promise<vscode.Task[]> {
    if (!this.tasksPromise) {
      this.tasksPromise = this.detectTasks();
    }
    return this.tasksPromise;
  }

  public resolveTask(task: vscode.Task): vscode.Task | undefined {
    const definition = task.definition as CortexTaskDefinition;

    if (definition.type === CortexTaskProvider.type && definition.command) {
      return this.createTask(
        definition.tool,
        definition.category,
        definition.command,
        task.scope as vscode.WorkspaceFolder
      );
    }

    return undefined;
  }

  private async detectTasks(): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return tasks;
    }

    const scanner = new ToolScanner(workspaceFolder.uri.fsPath);
    const result = await scanner.scan();

    for (const tool of result.tools) {
      tasks.push(this.createTask(tool.name, tool.category, tool.command, workspaceFolder));
    }

    return tasks;
  }

  private createTask(
    name: string,
    category: string,
    command: string,
    workspaceFolder: vscode.WorkspaceFolder
  ): vscode.Task {
    const definition: CortexTaskDefinition = {
      type: CortexTaskProvider.type,
      tool: name,
      category,
      command,
    };

    const task = new vscode.Task(
      definition,
      workspaceFolder,
      `${category}: ${name}`,
      'Cortex',
      new vscode.ShellExecution(command),
      [] // problem matchers
    );

    // Assign task group based on name patterns
    task.group = this.getTaskGroup(name, category);
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Shared,
    };

    return task;
  }

  private getTaskGroup(name: string, category: string): vscode.TaskGroup | undefined {
    const lowerName = name.toLowerCase();

    // Build tasks
    if (
      lowerName.includes('build') ||
      lowerName.includes('compile') ||
      lowerName.includes('bundle')
    ) {
      return vscode.TaskGroup.Build;
    }

    // Test tasks
    if (lowerName.includes('test') || lowerName.includes('spec')) {
      return vscode.TaskGroup.Test;
    }

    // Clean tasks
    if (lowerName.includes('clean') || lowerName.includes('clear')) {
      return vscode.TaskGroup.Clean;
    }

    return undefined;
  }

  public dispose(): void {
    this.fileWatcher?.dispose();
  }
}

/**
 * Fetches all Cortex-detected tasks for use in TreeView or other UI
 */
export async function getCortexTasks(): Promise<Tool[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return [];
  }

  const scanner = new ToolScanner(workspaceFolder.uri.fsPath);
  const result = await scanner.scan();
  return result.tools;
}
