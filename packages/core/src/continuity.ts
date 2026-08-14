import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  type ActorIdentity,
  type AgentEvent,
  CONTINUITY_SCHEMA_VERSION,
  type ContinuityAttempt,
  type ContinuityEvidence,
  type ContinuityHandoff,
  type ContinuityStatus,
  type ContinuityTask,
  type EvidenceAuthority,
  type EvidenceKind,
  type EvidenceSource,
  type EvidenceStatus,
  type RepositoryContext,
} from '@ecuabyte/cortex-shared';

export interface ContinuityStoreOptions {
  dbPath?: string;
}

export interface StartTaskInput {
  projectId: string;
  objective: string;
  acceptanceCriteria?: string[];
  repository: RepositoryContext;
  actor: ActorIdentity;
  taskId?: string;
  attemptId?: string;
}

export interface CaptureEvidenceInput {
  taskId: string;
  attemptId: string;
  kind: EvidenceKind;
  summary: string;
  details?: Record<string, unknown>;
  source: EvidenceSource;
  authority?: EvidenceAuthority;
  status?: EvidenceStatus;
  observedAt?: string;
}

export interface CreateHandoffInput {
  taskId: string;
  attemptId: string;
  summary?: string;
  nextActions?: string[];
}

export interface VerifyInput {
  taskId: string;
  attemptId: string;
  summary: string;
  source: EvidenceSource;
  details?: Record<string, unknown>;
  status?: EvidenceStatus;
}

export interface ResumeInput {
  taskId?: string;
  repository?: RepositoryContext;
}

export interface ResumeResult {
  task: ContinuityTask | null;
  attempt: ContinuityAttempt | null;
  handoff: ContinuityHandoff | null;
  evidence: ContinuityEvidence[];
}

export interface DetectInput {
  taskId: string;
  repository: RepositoryContext;
}

export interface DetectResult {
  taskId: string;
  stale: boolean;
  reasons: string[];
  expected: RepositoryContext;
  actual: RepositoryContext;
}

interface TaskRow {
  id: string;
  project_id: string;
  objective: string;
  acceptance_criteria: string;
  status: ContinuityStatus;
  repository: string;
  created_at: string;
  updated_at: string;
}

interface AttemptRow {
  id: string;
  task_id: string;
  actor: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
}

interface EvidenceRow {
  id: string;
  task_id: string;
  attempt_id: string;
  kind: EvidenceKind;
  summary: string;
  details: string | null;
  source: EvidenceSource;
  authority: EvidenceAuthority;
  status: EvidenceStatus;
  observed_at: string;
  recorded_at: string;
}

interface HandoffRow {
  payload: string;
}

export interface EventClaimInput {
  eventId: string;
  harness: string;
  sessionId: string;
  eventType: AgentEvent['type'];
  recordedAt: string;
}

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function toTask(row: TaskRow): ContinuityTask {
  return {
    id: row.id,
    projectId: row.project_id,
    objective: row.objective,
    acceptanceCriteria: parseJson<string[]>(row.acceptance_criteria),
    status: row.status,
    repository: parseJson<RepositoryContext>(row.repository),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAttempt(row: AttemptRow): ContinuityAttempt {
  return {
    id: row.id,
    taskId: row.task_id,
    actor: parseJson<ActorIdentity>(row.actor),
    status: row.status,
    startedAt: row.started_at,
    ...(row.ended_at ? { endedAt: row.ended_at } : {}),
  };
}

function toEvidence(row: EvidenceRow): ContinuityEvidence {
  return {
    id: row.id,
    taskId: row.task_id,
    attemptId: row.attempt_id,
    kind: row.kind,
    summary: row.summary,
    ...(row.details ? { details: parseJson<Record<string, unknown>>(row.details) } : {}),
    source: row.source,
    authority: row.authority,
    status: row.status,
    observedAt: row.observed_at,
    recordedAt: row.recorded_at,
  };
}

export class ContinuityStore {
  private readonly db: Database;

  constructor(options: ContinuityStoreOptions = {}) {
    const dbPath =
      options.dbPath ??
      process.env['CORTEX_CONTINUITY_DB'] ??
      join(homedir(), '.cortex', 'continuity.db');
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS continuity_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        objective TEXT NOT NULL,
        acceptance_criteria TEXT NOT NULL,
        status TEXT NOT NULL,
        repository TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS continuity_attempts (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        FOREIGN KEY (task_id) REFERENCES continuity_tasks(id)
      );

      CREATE TABLE IF NOT EXISTS continuity_evidence (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        attempt_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT,
        source TEXT NOT NULL,
        authority TEXT NOT NULL,
        status TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES continuity_tasks(id),
        FOREIGN KEY (attempt_id) REFERENCES continuity_attempts(id)
      );

      CREATE TABLE IF NOT EXISTS continuity_handoffs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        attempt_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES continuity_tasks(id),
        FOREIGN KEY (attempt_id) REFERENCES continuity_attempts(id)
      );

      CREATE TABLE IF NOT EXISTS continuity_events (
        event_id TEXT NOT NULL,
        harness TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        PRIMARY KEY (event_id, harness, session_id)
      );

      CREATE INDEX IF NOT EXISTS continuity_evidence_task_idx
        ON continuity_evidence(task_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS continuity_handoffs_task_idx
        ON continuity_handoffs(task_id, created_at DESC);
    `);
  }

  async startTask(
    input: StartTaskInput
  ): Promise<{ task: ContinuityTask; attempt: ContinuityAttempt }> {
    const now = new Date().toISOString();
    const taskId = input.taskId ?? createId('task');
    const attemptId = input.attemptId ?? createId('attempt');
    const existingTask = this.getTask(taskId);
    const task: ContinuityTask = existingTask ?? {
      id: taskId,
      projectId: input.projectId,
      objective: input.objective,
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      status: 'in_progress',
      repository: input.repository,
      createdAt: now,
      updatedAt: now,
    };

    if (!existingTask) {
      this.db
        .prepare(
          `INSERT INTO continuity_tasks
            (id, project_id, objective, acceptance_criteria, status, repository, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          task.id,
          task.projectId,
          task.objective,
          JSON.stringify(task.acceptanceCriteria),
          task.status,
          JSON.stringify(task.repository),
          task.createdAt,
          task.updatedAt
        );
    }

    const attempt: ContinuityAttempt = {
      id: attemptId,
      taskId: task.id,
      actor: input.actor,
      status: 'active',
      startedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO continuity_attempts (id, task_id, actor, status, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, NULL)`
      )
      .run(
        attempt.id,
        attempt.taskId,
        JSON.stringify(attempt.actor),
        attempt.status,
        attempt.startedAt
      );

    return { task, attempt };
  }

  async claimEvent(input: EventClaimInput): Promise<boolean> {
    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO continuity_events
          (event_id, harness, session_id, event_type, recorded_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(input.eventId, input.harness, input.sessionId, input.eventType, input.recordedAt);

    return result.changes === 1;
  }

  async getTaskById(id: string): Promise<ContinuityTask | null> {
    return this.getTask(id);
  }

  async getAttemptById(id: string): Promise<ContinuityAttempt | null> {
    return this.getAttempt(id);
  }

  async findActiveTask(repository: RepositoryContext): Promise<ContinuityTask | null> {
    const rows = this.db
      .prepare(
        `SELECT * FROM continuity_tasks
         WHERE status IN ('in_progress', 'blocked')
         ORDER BY updated_at DESC`
      )
      .all() as TaskRow[];

    return rows.map(toTask).find((task) => repositoryMatches(task.repository, repository)) ?? null;
  }

  async findAttemptBySession(taskId: string, sessionId: string): Promise<ContinuityAttempt | null> {
    const rows = this.db
      .prepare(
        `SELECT * FROM continuity_attempts
         WHERE task_id = ? AND status = 'active'
         ORDER BY started_at DESC`
      )
      .all(taskId) as AttemptRow[];

    return rows.map(toAttempt).find((attempt) => attempt.actor.sessionId === sessionId) ?? null;
  }

  async endAttempt(attemptId: string): Promise<ContinuityAttempt | null> {
    const endedAt = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE continuity_attempts
         SET status = 'ended', ended_at = ?
         WHERE id = ? AND status = 'active'`
      )
      .run(endedAt, attemptId);

    return this.getAttempt(attemptId);
  }

  async capture(input: CaptureEvidenceInput): Promise<ContinuityEvidence> {
    const recordedAt = new Date().toISOString();
    const evidence: ContinuityEvidence = {
      id: createId('evidence'),
      taskId: input.taskId,
      attemptId: input.attemptId,
      kind: input.kind,
      summary: input.summary,
      ...(input.details ? { details: input.details } : {}),
      source: input.source,
      authority: input.authority ?? 'observed',
      status: input.status ?? 'current',
      observedAt: input.observedAt ?? recordedAt,
      recordedAt,
    };

    this.db
      .prepare(
        `INSERT INTO continuity_evidence
          (id, task_id, attempt_id, kind, summary, details, source, authority, status, observed_at, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        evidence.id,
        evidence.taskId,
        evidence.attemptId,
        evidence.kind,
        evidence.summary,
        evidence.details ? JSON.stringify(evidence.details) : null,
        evidence.source,
        evidence.authority,
        evidence.status,
        evidence.observedAt,
        evidence.recordedAt
      );

    return evidence;
  }

  async createHandoff(input: CreateHandoffInput): Promise<ContinuityHandoff> {
    const task = this.getTask(input.taskId);
    const attempt = this.getAttempt(input.attemptId);
    if (!task) throw new Error(`Task not found: ${input.taskId}`);
    if (!attempt) throw new Error(`Attempt not found: ${input.attemptId}`);

    const evidence = this.listEvidence(input.taskId);
    const handoff: ContinuityHandoff = {
      id: createId('handoff'),
      schemaVersion: CONTINUITY_SCHEMA_VERSION,
      task,
      attempt,
      summary: input.summary ?? task.objective,
      decisions: evidence.filter((item) => item.kind === 'decision'),
      filesChanged: evidence.filter((item) => item.kind === 'file_change'),
      commands: evidence.filter((item) => item.kind === 'command'),
      tests: evidence.filter((item) => item.kind === 'test'),
      blockers: evidence.filter((item) => item.kind === 'blocker'),
      artifacts: evidence.filter((item) => item.kind === 'artifact'),
      evidence,
      nextActions: input.nextActions ?? [],
      freshness: 'current',
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `INSERT INTO continuity_handoffs (id, task_id, attempt_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        handoff.id,
        handoff.task.id,
        handoff.attempt.id,
        JSON.stringify(handoff),
        handoff.createdAt
      );

    return handoff;
  }

  async verify(input: VerifyInput): Promise<ContinuityEvidence> {
    return this.capture({
      taskId: input.taskId,
      attemptId: input.attemptId,
      kind: 'verification',
      summary: input.summary,
      source: input.source,
      authority: 'verified',
      status: input.status ?? 'current',
      ...(input.details ? { details: input.details } : {}),
    });
  }

  async resume(input: ResumeInput): Promise<ResumeResult> {
    const task = input.taskId
      ? this.getTask(input.taskId)
      : input.repository
        ? await this.findActiveTask(input.repository)
        : this.getLatestTask();
    if (!task) return { task: null, attempt: null, handoff: null, evidence: [] };

    const attempt = this.getLatestAttempt(task.id);
    const handoffRow = this.db
      .prepare(
        'SELECT payload FROM continuity_handoffs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(task.id) as HandoffRow | null;

    return {
      task,
      attempt,
      handoff: handoffRow ? parseJson<ContinuityHandoff>(handoffRow.payload) : null,
      evidence: this.listEvidence(task.id),
    };
  }

  async detect(input: DetectInput): Promise<DetectResult> {
    const task = this.getTask(input.taskId);
    if (!task) throw new Error(`Task not found: ${input.taskId}`);

    const reasons: string[] = [];
    if (task.repository.remote && input.repository.remote !== task.repository.remote) {
      reasons.push('remote_changed');
    }
    if (task.repository.branch && input.repository.branch !== task.repository.branch) {
      reasons.push('branch_changed');
    }
    if (task.repository.commit && input.repository.commit !== task.repository.commit) {
      reasons.push('commit_changed');
    }
    if (task.repository.worktree && input.repository.worktree !== task.repository.worktree) {
      reasons.push('worktree_changed');
    }

    return {
      taskId: task.id,
      stale: reasons.length > 0,
      reasons,
      expected: task.repository,
      actual: input.repository,
    };
  }

  close(): void {
    this.db.close();
  }

  private getTask(id: string): ContinuityTask | null {
    const row = this.db
      .prepare('SELECT * FROM continuity_tasks WHERE id = ?')
      .get(id) as TaskRow | null;
    return row ? toTask(row) : null;
  }

  private getLatestTask(): ContinuityTask | null {
    const row = this.db
      .prepare('SELECT * FROM continuity_tasks ORDER BY updated_at DESC LIMIT 1')
      .get() as TaskRow | null;
    return row ? toTask(row) : null;
  }

  private getAttempt(id: string): ContinuityAttempt | null {
    const row = this.db
      .prepare('SELECT * FROM continuity_attempts WHERE id = ?')
      .get(id) as AttemptRow | null;
    return row ? toAttempt(row) : null;
  }

  private getLatestAttempt(taskId: string): ContinuityAttempt | null {
    const row = this.db
      .prepare(
        'SELECT * FROM continuity_attempts WHERE task_id = ? ORDER BY started_at DESC LIMIT 1'
      )
      .get(taskId) as AttemptRow | null;
    return row ? toAttempt(row) : null;
  }

  private listEvidence(taskId: string): ContinuityEvidence[] {
    const rows = this.db
      .prepare('SELECT * FROM continuity_evidence WHERE task_id = ? ORDER BY recorded_at ASC')
      .all(taskId) as EvidenceRow[];
    return rows.map(toEvidence);
  }
}

function repositoryMatches(expected: RepositoryContext, actual: RepositoryContext): boolean {
  if (expected.remote && expected.remote !== actual.remote) return false;
  if (expected.branch && expected.branch !== actual.branch) return false;
  if (expected.worktree && expected.worktree !== actual.worktree) return false;

  return Boolean(
    (expected.remote && actual.remote) ||
      (expected.worktree && actual.worktree) ||
      expected.root === actual.root
  );
}
