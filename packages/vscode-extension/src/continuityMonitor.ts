import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type {
  ActorIdentity,
  ContinuityAttempt,
  ContinuityEventRecord,
  ContinuityEvidence,
  ContinuityHandoff,
  ContinuityStatus,
  ContinuityTask,
  EvidenceAuthority,
  EvidenceKind,
  EvidenceSource,
  EvidenceStatus,
  RepositoryContext,
} from '@ecuabyte/cortex-shared';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { type CodexRolloutCache, readCodexRollouts } from './codexRollout';
import {
  buildContinuityDashboardSnapshot,
  type ContinuityDashboardInput,
  type ContinuityDashboardSnapshot,
  type ContinuityDashboardWorkspace,
} from './continuityDashboard';

export interface ContinuityQueryAdapter {
  query<T>(table: string): T[];
}

export function parseContinuityEventJournal(text: string): ContinuityEventRecord[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as ContinuityEventRecord];
      } catch {
        return [];
      }
    });
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

interface EventRow {
  event_id: string;
  event_type: ContinuityEventRecord['type'];
  session_id: string;
  agent: string;
  repository: string;
  project_id: string | null;
  task_id: string | null;
  attempt_id: string | null;
  summary: string | null;
  details: string | null;
  source?: EvidenceSource | null;
  authority?: EvidenceAuthority | null;
  status: EvidenceStatus | null;
  occurred_at: string | null;
  recorded_at: string;
}

interface HandoffRow {
  payload: string;
  created_at: string;
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

function toEvent(row: EventRow): ContinuityEventRecord {
  return {
    eventId: row.event_id,
    type: row.event_type,
    sessionId: row.session_id,
    agent: parseJson<ActorIdentity>(row.agent),
    repository: parseJson<RepositoryContext>(row.repository),
    ...(row.project_id ? { projectId: row.project_id } : {}),
    ...(row.task_id ? { taskId: row.task_id } : {}),
    ...(row.attempt_id ? { attemptId: row.attempt_id } : {}),
    ...(row.summary ? { summary: row.summary } : {}),
    ...(row.details ? { details: parseJson<Record<string, unknown>>(row.details) } : {}),
    ...(row.source ? { source: row.source } : {}),
    ...(row.authority ? { authority: row.authority } : {}),
    ...(row.status ? { status: row.status } : {}),
    ...(row.occurred_at ? { occurredAt: row.occurred_at } : {}),
    recordedAt: row.recorded_at,
  };
}

export async function readContinuityRows(
  adapter: ContinuityQueryAdapter,
  workspace: ContinuityDashboardWorkspace = { name: 'Workspace', root: '' }
): Promise<ContinuityDashboardInput> {
  const read = <T>(table: string): T[] => {
    try {
      return adapter.query<T>(table);
    } catch {
      return [];
    }
  };

  const tasks = read<TaskRow>('continuity_tasks').map(toTask);
  const attempts = read<AttemptRow>('continuity_attempts').map(toAttempt);
  const evidence = read<EvidenceRow>('continuity_evidence').map(toEvidence);
  const events = read<EventRow>('continuity_event_log').map(toEvent);
  const handoffs = read<HandoffRow>('continuity_handoffs')
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .flatMap((row) => {
      try {
        return [parseJson<ContinuityHandoff>(row.payload)];
      } catch {
        return [];
      }
    });

  return { workspace, tasks, attempts, evidence, events, handoffs };
}

function createSqlAdapter(db: Database): ContinuityQueryAdapter {
  return {
    query<T>(table: string): T[] {
      const result = db.exec(`SELECT * FROM ${table}`);
      if (!result[0]) return [];
      return result[0].values.map((values) => {
        const row: Record<string, SqlValue> = {};
        result[0]?.columns.forEach((column, index) => {
          row[column] = values[index] ?? null;
        });
        return row as T;
      });
    },
  };
}

export interface ContinuityMonitorOptions {
  dbPath?: string;
  eventJournalPath?: string;
  codexSessionsPath?: string;
  extensionPath?: string;
}

export class ContinuityMonitor {
  private readonly dbPath: string;
  private readonly eventJournalPath: string;
  private readonly codexSessionsPath: string;
  private readonly extensionPath?: string;
  private sqlPromise: Promise<ReturnType<typeof initSqlJs>> | undefined;
  private readonly codexCache: CodexRolloutCache = new Map();
  private lastModified = 0;

  constructor(options: ContinuityMonitorOptions = {}) {
    this.dbPath = options.dbPath ?? join(homedir(), '.cortex', 'continuity.db');
    this.eventJournalPath =
      options.eventJournalPath ?? join(dirname(this.dbPath), 'continuity.events.ndjson');
    this.codexSessionsPath = options.codexSessionsPath ?? join(homedir(), '.codex', 'sessions');
    this.extensionPath = options.extensionPath;
  }

  async read(workspace: ContinuityDashboardWorkspace): Promise<ContinuityDashboardSnapshot> {
    const generatedAt = new Date().toISOString();
    if (
      !existsSync(this.dbPath) &&
      !existsSync(this.eventJournalPath) &&
      !existsSync(this.codexSessionsPath)
    ) {
      return buildContinuityDashboardSnapshot({
        workspace,
        tasks: [],
        attempts: [],
        evidence: [],
        events: [],
        handoffs: [],
        now: generatedAt,
      });
    }

    try {
      let input: ContinuityDashboardInput = {
        workspace,
        tasks: [],
        attempts: [],
        evidence: [],
        events: [],
        handoffs: [],
      };
      if (existsSync(this.dbPath)) {
        const SQL = await this.getSql();
        const db = new SQL.Database(readFileSync(this.dbPath));
        input = await readContinuityRows(createSqlAdapter(db), workspace);
        db.close();
      }
      const journalEvents = existsSync(this.eventJournalPath)
        ? parseContinuityEventJournal(readFileSync(this.eventJournalPath, 'utf8'))
        : [];
      const rolloutInput = readCodexRollouts(this.codexSessionsPath, workspace, this.codexCache);
      const eventKeys = new Set(
        input.events.map((event) => `${event.eventId}:${event.type}:${event.sessionId}`)
      );
      input.events = [
        ...rolloutInput.events.filter((event) => {
          const key = `${event.eventId}:${event.type}:${event.sessionId}`;
          if (eventKeys.has(key)) return false;
          eventKeys.add(key);
          return true;
        }),
        ...journalEvents.filter((event) => {
          const key = `${event.eventId}:${event.type}:${event.sessionId}`;
          if (eventKeys.has(key)) return false;
          eventKeys.add(key);
          return true;
        }),
        ...input.events,
      ];
      input.tasks = [...input.tasks, ...rolloutInput.tasks];
      input.attempts = [...input.attempts, ...rolloutInput.attempts];
      input.evidence = [...input.evidence, ...rolloutInput.evidence];
      this.lastModified = Math.max(
        existsSync(this.dbPath) ? statSync(this.dbPath).mtimeMs : 0,
        existsSync(this.eventJournalPath) ? statSync(this.eventJournalPath).mtimeMs : 0
      );
      return buildContinuityDashboardSnapshot({ ...input, now: generatedAt });
    } catch (error) {
      console.warn('[Cortex] Continuity monitor read failed:', error);
      return buildContinuityDashboardSnapshot({
        workspace,
        tasks: [],
        attempts: [],
        evidence: [],
        events: [],
        handoffs: [],
        now: generatedAt,
      });
    }
  }

  hasChanged(): boolean {
    const dbChanged = existsSync(this.dbPath) && statSync(this.dbPath).mtimeMs > this.lastModified;
    const journalChanged =
      existsSync(this.eventJournalPath) &&
      statSync(this.eventJournalPath).mtimeMs > this.lastModified;
    return dbChanged || journalChanged;
  }

  private async getSql() {
    if (!this.sqlPromise) {
      const wasmPaths = [
        this.extensionPath ? join(this.extensionPath, 'dist', 'sql-wasm.wasm') : '',
        this.extensionPath ? join(this.extensionPath, 'sql-wasm.wasm') : '',
      ].filter(Boolean);

      try {
        const require = createRequire(import.meta.url);
        const sqlJsPath = require.resolve('sql.js');
        wasmPaths.push(join(sqlJsPath, '..', 'sql-wasm.wasm'));
      } catch {
        // Bundled deployments provide the wasm path above.
      }

      const wasmPath = wasmPaths.find((candidate) => existsSync(candidate));
      this.sqlPromise = initSqlJs(
        wasmPath ? { locateFile: () => wasmPath } : undefined
      ) as unknown as Promise<ReturnType<typeof initSqlJs>>;
    }

    return this.sqlPromise;
  }
}
