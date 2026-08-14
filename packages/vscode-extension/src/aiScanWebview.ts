import * as vscode from 'vscode';
import type { AIMemory, ProjectArea } from './aiScanner';
import type { ContinuityDashboardSnapshot } from './continuityDashboard';
import { getContinuityDashboardHtml } from './continuityDashboardHtml';
import { type DashboardMemory, DashboardMemoryState } from './scanRuntime';

/** The single Cortex editor surface for live continuity and legacy scan actions. */
export class AIScanWebview {
  private panel: vscode.WebviewPanel | undefined;
  private projectContext: { name: string; techStack: string[] } | undefined;
  private areas: ProjectArea[] = [];
  private memoryState = new DashboardMemoryState<AIMemory & DashboardMemory>();
  private persistenceWrite: Promise<void> = Promise.resolve();
  private status: 'selecting' | 'analyzing' | 'complete' | 'error' = 'selecting';
  private statusMessage = '';
  private modelName = '';
  private summary: { memories: number; files: number; model?: string } | undefined;
  private continuitySnapshot: ContinuityDashboardSnapshot | undefined;

  // biome-ignore lint/suspicious/noExplicitAny: Webview messages have provider-specific payloads.
  private readonly _onDidReceiveMessage = new vscode.EventEmitter<any>();
  readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

  private readonly _onDidAnalyzeArea = new vscode.EventEmitter<string>();
  readonly onDidAnalyzeArea = this._onDidAnalyzeArea.event;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: Workspace state is backwards-compatible data.
    const state = this.context.workspaceState.get<any>('cortexDashboardState');
    if (!state) return;

    this.projectContext = state.projectContext;
    this.areas = state.areas || [];
    this.memoryState.hydrate(state.memories || []);
    this.status = state.status || 'selecting';
    this.statusMessage = state.statusMessage || '';
    this.modelName = state.modelName || '';
    this.summary = state.summary;
    this.continuitySnapshot = state.continuitySnapshot;
  }

  private savePersistence() {
    const snapshot = {
      projectContext: this.projectContext,
      areas: this.areas,
      memories: this.memoryState.getAll(),
      status: this.status,
      statusMessage: this.statusMessage,
      modelName: this.modelName,
      summary: this.summary,
      continuitySnapshot: this.continuitySnapshot,
    };

    this.persistenceWrite = this.persistenceWrite
      .then(() => this.context.workspaceState.update('cortexDashboardState', snapshot))
      .catch(() => undefined);
  }

  public clearState() {
    this.projectContext = undefined;
    this.areas = [];
    this.memoryState.clear();
    this.status = 'selecting';
    this.statusMessage = '';
    this.modelName = '';
    this.summary = undefined;
    this.savePersistence();
    this.postMessage({ type: 'clearState' });
  }

  show(context: vscode.ExtensionContext) {
    if (this.panel) {
      this.panel.reveal();
      this.hydrate();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'cortexAIScan',
      'Cortex Continuity Cockpit',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
      }
    );

    this.setupPanel(panel, context);
  }

  attach(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.setupPanel(panel, context);
  }

  private setupPanel(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.panel.webview.onDidReceiveMessage(
      (message) => this._onDidReceiveMessage.fire(message),
      null,
      context.subscriptions
    );
    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      context.subscriptions
    );
    this.hydrate();
  }

  public hydrate() {
    if (!this.panel) return;

    this.postMessage({
      type: 'hydrate',
      state: {
        projectContext: this.projectContext,
        areas: this.areas,
        memories: this.memoryState.getAll(),
        status: this.status,
        statusMessage: this.statusMessage,
        modelName: this.modelName,
        summary: this.summary,
        continuity: this.continuitySnapshot,
      },
    });
  }

  getProjectContext() {
    return this.projectContext;
  }

  setProjectContext(name: string, techStack: string[]) {
    this.projectContext = { name, techStack };
    this.savePersistence();
  }

  setContinuitySnapshot(snapshot: ContinuityDashboardSnapshot) {
    this.continuitySnapshot = snapshot;
    this.postMessage({ type: 'continuitySnapshot', snapshot });
  }

  getContinuitySnapshot() {
    return this.continuitySnapshot;
  }

  getArea(name: string) {
    return this.areas.find((area) => area.name === name);
  }

  setAreas(areas: ProjectArea[]) {
    this.areas = areas;
    this.savePersistence();
  }

  updateAreaStatus(
    areaName: string,
    status: 'pending' | 'analyzing' | 'complete' | 'skipped' | 'error',
    memoryCount?: number
  ) {
    const area = this.getArea(areaName);
    if (area) {
      area.status = status;
      if (memoryCount !== undefined) area.memoryCount = memoryCount;
      this.savePersistence();
    }
  }

  setStatus(status: 'selecting' | 'analyzing' | 'complete' | 'error', message: string) {
    this.status = status;
    this.statusMessage = message;
    this.savePersistence();
  }

  setModel(name: string, _allModels: string[]) {
    this.modelName = name;
    this.savePersistence();
  }

  setTree(tree: string, stats: { lines: number }) {
    this.postMessage({ type: 'tree', tree, stats });
  }

  setSelectedFiles(files: string[]) {
    this.postMessage({ type: 'files', files });
  }

  streamChunk(chunk: string) {
    this.postMessage({ type: 'chunk', chunk });
  }

  getMemories(): AIMemory[] {
    return this.memoryState.getAll();
  }

  addMemory(memory: AIMemory) {
    if (!this.memoryState.add(memory)) return;
    this.savePersistence();
  }

  setSummary(memories: number, files: number, model: string) {
    this.summary = { memories, files, model };
    this.savePersistence();
  }

  postMessage(message: unknown) {
    this.panel?.webview.postMessage(message);
  }

  private getHtml(): string {
    return getContinuityDashboardHtml(this.panel?.webview.cspSource ?? '');
  }
}
