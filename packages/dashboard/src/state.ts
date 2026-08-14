export type DashboardFilter = 'all' | 'errors';

export interface DashboardActorLike {
  harness: string;
  model?: string;
  version?: string;
  sessionId?: string;
}

export interface DashboardRepositoryLike {
  root: string;
  branch?: string;
  commit?: string;
  remote?: string;
  worktree?: string;
}

export interface DashboardEvidenceSummaryLike {
  current: number;
  verified: number;
  unverified: number;
  failed: number;
  stale: number;
  conflicts: number;
}

export interface DashboardEventLike {
  id: string;
  kind: string;
  type: string;
  summary: string;
  status: string;
  authority?: string;
  source?: string;
  timestamp: string;
  taskId?: string;
  attemptId?: string;
  agent: DashboardActorLike;
  repository: DashboardRepositoryLike;
  details?: Record<string, unknown>;
}

export interface DashboardTaskLike {
  id: string;
  objective: string;
  acceptanceCriteria: readonly string[];
  status: string;
  actor?: DashboardActorLike;
  attemptId?: string;
  repository: DashboardRepositoryLike;
  createdAt: string;
  updatedAt: string;
  latestEvent?: Pick<DashboardEventLike, 'timestamp'>;
  evidence: DashboardEvidenceSummaryLike;
}

export interface DashboardSnapshotLike {
  activeTaskId?: string;
  workspace: { name: string; root: string };
  connection: string;
  lastSeenAt?: string;
  tasks: readonly DashboardTaskLike[];
  events: readonly DashboardEventLike[];
  evidenceSummary: DashboardEvidenceSummaryLike;
  generatedAt: string;
}

export interface DashboardState<Snapshot extends DashboardSnapshotLike> {
  snapshot: Snapshot | null;
  selectedTaskId?: string;
  selectedEventId?: string;
  filter: DashboardFilter;
}

export type DashboardAction<Snapshot extends DashboardSnapshotLike> =
  | { type: 'hydrate'; snapshot: Snapshot | null }
  | { type: 'selectTask'; taskId: string }
  | { type: 'selectEvent'; eventId: string }
  | { type: 'setFilter'; filter: DashboardFilter };

export interface DashboardStore<Snapshot extends DashboardSnapshotLike> {
  getState(): DashboardState<Snapshot>;
  dispatch(action: DashboardAction<Snapshot>): void;
  subscribe(listener: () => void): () => void;
}

function taskExists<Snapshot extends DashboardSnapshotLike>(snapshot: Snapshot, taskId?: string) {
  return Boolean(taskId && snapshot.tasks.some((task) => task.id === taskId));
}

function eventForTask<Snapshot extends DashboardSnapshotLike>(snapshot: Snapshot, taskId?: string) {
  return snapshot.events.find((event) => event.taskId === taskId);
}

function eventExistsForTask<Snapshot extends DashboardSnapshotLike>(
  snapshot: Snapshot,
  eventId: string | undefined,
  taskId: string | undefined
) {
  return Boolean(
    eventId && snapshot.events.some((event) => event.id === eventId && event.taskId === taskId)
  );
}

function selectedTaskId<Snapshot extends DashboardSnapshotLike>(
  snapshot: Snapshot,
  preferredTaskId?: string
) {
  if (taskExists(snapshot, preferredTaskId)) return preferredTaskId;
  if (taskExists(snapshot, snapshot.activeTaskId)) return snapshot.activeTaskId;
  return snapshot.tasks[0]?.id;
}

function selectedEventId<Snapshot extends DashboardSnapshotLike>(
  snapshot: Snapshot,
  taskId: string | undefined,
  preferredEventId?: string
) {
  if (eventExistsForTask(snapshot, preferredEventId, taskId)) return preferredEventId;
  return eventForTask(snapshot, taskId)?.id;
}

function normalizeSelection<Snapshot extends DashboardSnapshotLike>(
  snapshot: Snapshot | null,
  preferredTaskId?: string,
  preferredEventId?: string
): Pick<DashboardState<Snapshot>, 'selectedTaskId' | 'selectedEventId'> {
  if (!snapshot) {
    return { selectedTaskId: undefined, selectedEventId: undefined };
  }
  const taskId = selectedTaskId(snapshot, preferredTaskId);
  const eventId = selectedEventId(snapshot, taskId, preferredEventId);
  return {
    selectedTaskId: taskId,
    selectedEventId: eventId,
  };
}

export function dashboardReducer<Snapshot extends DashboardSnapshotLike>(
  state: DashboardState<Snapshot>,
  action: DashboardAction<Snapshot>
): DashboardState<Snapshot> {
  if (action.type === 'hydrate') {
    return {
      ...state,
      snapshot: action.snapshot,
      ...normalizeSelection(action.snapshot, state.selectedTaskId, state.selectedEventId),
    };
  }

  if (!state.snapshot) return state;

  if (action.type === 'selectTask') {
    if (!taskExists(state.snapshot, action.taskId)) return state;
    return {
      ...state,
      selectedTaskId: action.taskId,
      ...normalizeSelection(state.snapshot, action.taskId),
    };
  }

  if (action.type === 'selectEvent') {
    const event = state.snapshot.events.find((candidate) => candidate.id === action.eventId);
    if (!event) return state;
    return {
      ...state,
      ...(event.taskId ? { selectedTaskId: event.taskId } : {}),
      selectedEventId: event.id,
    };
  }

  return action.type === 'setFilter' ? { ...state, filter: action.filter } : state;
}

export function createDashboardStore<Snapshot extends DashboardSnapshotLike>(
  initialState: Partial<DashboardState<Snapshot>> = {}
): DashboardStore<Snapshot> {
  let state: DashboardState<Snapshot> = {
    snapshot: initialState.snapshot ?? null,
    filter: initialState.filter ?? 'all',
    ...normalizeSelection(
      initialState.snapshot ?? null,
      initialState.selectedTaskId,
      initialState.selectedEventId
    ),
  };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    dispatch: (action) => {
      const nextState = dashboardReducer(state, action);
      if (nextState === state) return;
      state = nextState;
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
