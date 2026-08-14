import {
  createDashboardStore,
  DashboardApp,
  type DashboardTransport,
} from '@ecuabyte/cortex-dashboard';
import {
  type DashboardCommand,
  type DashboardSnapshot,
  dashboardCommandSchema,
  dashboardMessageSchema,
} from '@ecuabyte/cortex-shared';
import { createRoot } from 'react-dom/client';

interface VsCodeApi {
  postMessage(message: DashboardCommand): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const store = createDashboardStore<DashboardSnapshot>();

const transport: DashboardTransport = {
  send(command) {
    const result = dashboardCommandSchema.safeParse(command);
    if (result.success) vscode.postMessage(result.data);
  },
};

function hydrateSnapshot(snapshot: DashboardSnapshot | null) {
  store.dispatch({ type: 'hydrate', snapshot });
}

function handleMessage(event: MessageEvent<unknown>) {
  const result = dashboardMessageSchema.safeParse(event.data);
  if (!result.success) return;

  if (result.data.type === 'continuitySnapshot') {
    hydrateSnapshot(result.data.snapshot);
    return;
  }

  if (result.data.type === 'hydrate') {
    hydrateSnapshot(result.data.state.continuity ?? null);
    return;
  }

  if (result.data.type === 'clearState') {
    hydrateSnapshot(null);
  }
}

window.addEventListener('message', handleMessage);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Cortex dashboard root element is missing');

createRoot(rootElement).render(<DashboardApp store={store} transport={transport} />);
vscode.postMessage({ type: 'ready' });
