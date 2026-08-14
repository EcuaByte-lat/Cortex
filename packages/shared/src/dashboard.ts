import type {
  ActorIdentity,
  ContinuityAttempt,
  ContinuityEventRecord,
  ContinuityEvidence,
  ContinuityHandoff,
  ContinuityTask,
  EvidenceAuthority,
  EvidenceSource,
  RepositoryContext,
} from './continuity';

export type DashboardConnection = 'live' | 'stale' | 'offline';
export type DashboardTaskStatus = 'working' | 'waiting' | 'blocked' | 'completed' | 'abandoned';
export type DashboardEventKind =
  | 'session'
  | 'prompt'
  | 'tool'
  | 'file'
  | 'command'
  | 'checkpoint'
  | 'error'
  | 'evidence';

export interface ContinuityDashboardWorkspace {
  name: string;
  root: string;
}

export interface ContinuityDashboardInput {
  workspace: ContinuityDashboardWorkspace;
  tasks: ContinuityTask[];
  attempts: ContinuityAttempt[];
  evidence: ContinuityEvidence[];
  events: ContinuityEventRecord[];
  handoffs: ContinuityHandoff[];
  now?: string;
}

export interface DashboardEvent {
  id: string;
  kind: DashboardEventKind;
  type: ContinuityEventRecord['type'];
  summary: string;
  status: string;
  authority?: EvidenceAuthority;
  source?: EvidenceSource;
  timestamp: string;
  taskId?: string;
  attemptId?: string;
  agent: ActorIdentity;
  repository: RepositoryContext;
  details?: Record<string, unknown>;
}

export interface DashboardEvidenceSummary {
  current: number;
  verified: number;
  unverified: number;
  failed: number;
  stale: number;
  conflicts: number;
}

export interface DashboardTask {
  id: string;
  objective: string;
  acceptanceCriteria: string[];
  status: DashboardTaskStatus;
  actor?: ActorIdentity;
  attemptId?: string;
  repository: RepositoryContext;
  createdAt: string;
  updatedAt: string;
  latestEvent?: DashboardEvent;
  evidence: DashboardEvidenceSummary;
}

export interface ContinuityDashboardSnapshot {
  workspace: ContinuityDashboardWorkspace;
  connection: DashboardConnection;
  lastSeenAt?: string;
  activeTaskId?: string;
  tasks: DashboardTask[];
  events: DashboardEvent[];
  evidenceSummary: DashboardEvidenceSummary;
  latestHandoff?: ContinuityHandoff;
  generatedAt: string;
}

const LIVE_WINDOW_MS = 15_000;
const STALE_WINDOW_MS = 5 * 60_000;

function toTimestamp(event: ContinuityEventRecord): string {
  return event.occurredAt ?? event.recordedAt;
}

function eventKind(type: ContinuityEventRecord['type']): DashboardEventKind {
  if (type === 'prompt.submitted') return 'prompt';
  if (type === 'tool.completed') return 'tool';
  if (type === 'tool.failed') return 'error';
  if (type === 'file.changed') return 'file';
  if (type === 'command.completed') return 'command';
  if (type === 'session.started' || type === 'session.ended') return 'session';
  if (type === 'compaction.started' || type === 'session.idle') return 'checkpoint';
  return 'evidence';
}

function evidenceHealth(items: ContinuityEvidence[]): DashboardEvidenceSummary {
  return items.reduce<DashboardEvidenceSummary>(
    (summary, item) => {
      if (item.status === 'current') summary.current += 1;
      if (item.authority === 'verified') summary.verified += 1;
      if (item.status === 'unverified' || item.authority === 'unknown') summary.unverified += 1;
      if (item.status === 'failed') summary.failed += 1;
      if (item.status === 'stale') summary.stale += 1;
      if (item.status === 'superseded') summary.conflicts += 1;
      return summary;
    },
    { current: 0, verified: 0, unverified: 0, failed: 0, stale: 0, conflicts: 0 }
  );
}

function taskStatus(
  task: ContinuityTask,
  attempt: ContinuityAttempt | undefined,
  latestEvent: DashboardEvent | undefined,
  now: number
): DashboardTaskStatus {
  if (task.status === 'blocked') return 'blocked';
  if (task.status === 'completed') return 'completed';
  if (task.status === 'abandoned') return 'abandoned';
  if (latestEvent?.type === 'tool.failed') return 'blocked';
  if (attempt?.status === 'active' && latestEvent) {
    return now - new Date(latestEvent.timestamp).getTime() <= LIVE_WINDOW_MS
      ? 'working'
      : 'waiting';
  }
  return attempt?.status === 'active' ? 'waiting' : 'completed';
}

export function buildContinuityDashboardSnapshot(
  input: ContinuityDashboardInput
): ContinuityDashboardSnapshot {
  const generatedAt = input.now ?? new Date().toISOString();
  const now = new Date(generatedAt).getTime();
  const events = input.events
    .map<DashboardEvent>((event) => ({
      id: event.eventId,
      kind: eventKind(event.type),
      type: event.type,
      summary: event.summary ?? event.type,
      status: event.status ?? (event.type === 'tool.failed' ? 'failed' : 'observed'),
      ...(event.authority ? { authority: event.authority } : {}),
      ...(event.source ? { source: event.source } : {}),
      timestamp: toTimestamp(event),
      agent: event.agent,
      repository: event.repository,
      ...(event.taskId ? { taskId: event.taskId } : {}),
      ...(event.attemptId ? { attemptId: event.attemptId } : {}),
      ...(event.details ? { details: event.details } : {}),
    }))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  const tasks = input.tasks
    .map<DashboardTask>((task) => {
      const taskEvents = events.filter((event) => event.taskId === task.id);
      const latestEvent = taskEvents[0];
      const attempt = input.attempts
        .filter((candidate) => candidate.taskId === task.id)
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
      const taskEvidence = input.evidence.filter((item) => item.taskId === task.id);
      return {
        id: task.id,
        objective: task.objective,
        acceptanceCriteria: task.acceptanceCriteria,
        status: taskStatus(task, attempt, latestEvent, now),
        ...(attempt?.actor ? { actor: attempt.actor } : {}),
        ...(attempt?.id ? { attemptId: attempt.id } : {}),
        repository: task.repository,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        ...(latestEvent ? { latestEvent } : {}),
        evidence: evidenceHealth(taskEvidence),
      };
    })
    .sort((left, right) => {
      const activeScore = (status: DashboardTaskStatus) =>
        status === 'working' ? 0 : status === 'blocked' ? 1 : status === 'waiting' ? 2 : 3;
      return (
        activeScore(left.status) - activeScore(right.status) ||
        right.updatedAt.localeCompare(left.updatedAt)
      );
    });

  const lastSeenAt = events[0]?.timestamp;
  const age = lastSeenAt ? now - new Date(lastSeenAt).getTime() : Number.POSITIVE_INFINITY;
  const connection: DashboardConnection =
    age <= LIVE_WINDOW_MS ? 'live' : age <= STALE_WINDOW_MS ? 'stale' : 'offline';
  const activeTaskId = tasks.find(
    (task) => task.status === 'working' || task.status === 'blocked'
  )?.id;

  return {
    workspace: input.workspace,
    connection,
    ...(lastSeenAt ? { lastSeenAt } : {}),
    ...(activeTaskId ? { activeTaskId } : {}),
    tasks,
    events: events.slice(0, 100),
    evidenceSummary: evidenceHealth(input.evidence),
    ...(input.handoffs[0] ? { latestHandoff: input.handoffs[0] } : {}),
    generatedAt,
  };
}
