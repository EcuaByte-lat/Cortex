export const CONTINUITY_SCHEMA_VERSION = '0.1' as const;

export type ContinuityStatus = 'in_progress' | 'blocked' | 'completed' | 'abandoned';

export type EvidenceKind =
  | 'observation'
  | 'decision'
  | 'command'
  | 'file_change'
  | 'test'
  | 'blocker'
  | 'artifact'
  | 'verification';

export type EvidenceSource = 'git' | 'ci' | 'tool' | 'file' | 'human' | 'agent' | 'external';

export type EvidenceAuthority = 'observed' | 'verified' | 'approved' | 'inferred' | 'unknown';

export type EvidenceStatus = 'current' | 'stale' | 'superseded' | 'failed' | 'unverified';

export type AgentEventType =
  | 'session.started'
  | 'prompt.submitted'
  | 'tool.completed'
  | 'tool.failed'
  | 'file.changed'
  | 'command.completed'
  | 'compaction.started'
  | 'session.idle'
  | 'session.ended';

export interface ActorIdentity {
  harness: string;
  model?: string;
  version?: string;
  sessionId?: string;
}

export interface AgentEvent {
  eventId: string;
  type: AgentEventType;
  sessionId: string;
  agent: ActorIdentity;
  repository: RepositoryContext;
  projectId?: string;
  taskId?: string;
  attemptId?: string;
  objective?: string;
  summary?: string;
  details?: Record<string, unknown>;
  evidenceKind?: EvidenceKind;
  source?: EvidenceSource;
  authority?: EvidenceAuthority;
  status?: EvidenceStatus;
  occurredAt?: string;
}

export interface AgentBridgeResult {
  accepted: boolean;
  duplicate: boolean;
  task: ContinuityTask | null;
  attempt: ContinuityAttempt | null;
  evidence?: ContinuityEvidence;
  handoff?: ContinuityHandoff;
}

export interface ContinuityEventRecord {
  eventId: string;
  type: AgentEventType;
  sessionId: string;
  agent: ActorIdentity;
  repository: RepositoryContext;
  projectId?: string;
  taskId?: string;
  attemptId?: string;
  summary?: string;
  details?: Record<string, unknown>;
  source?: EvidenceSource;
  authority?: EvidenceAuthority;
  status?: EvidenceStatus;
  occurredAt?: string;
  recordedAt: string;
}

export interface RepositoryContext {
  root: string;
  remote?: string;
  branch?: string;
  commit?: string;
  worktree?: string;
}

export interface ContinuityTask {
  id: string;
  projectId: string;
  objective: string;
  acceptanceCriteria: string[];
  status: ContinuityStatus;
  repository: RepositoryContext;
  createdAt: string;
  updatedAt: string;
}

export interface ContinuityAttempt {
  id: string;
  taskId: string;
  actor: ActorIdentity;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
}

export interface ContinuityEvidence {
  id: string;
  taskId: string;
  attemptId: string;
  kind: EvidenceKind;
  summary: string;
  details?: Record<string, unknown>;
  source: EvidenceSource;
  authority: EvidenceAuthority;
  status: EvidenceStatus;
  observedAt: string;
  recordedAt: string;
}

export interface ContinuityHandoff {
  id: string;
  schemaVersion: typeof CONTINUITY_SCHEMA_VERSION;
  task: ContinuityTask;
  attempt: ContinuityAttempt;
  summary: string;
  decisions: ContinuityEvidence[];
  filesChanged: ContinuityEvidence[];
  commands: ContinuityEvidence[];
  tests: ContinuityEvidence[];
  blockers: ContinuityEvidence[];
  artifacts: ContinuityEvidence[];
  evidence: ContinuityEvidence[];
  nextActions: string[];
  freshness: 'current' | 'stale' | 'unknown';
  createdAt: string;
}
