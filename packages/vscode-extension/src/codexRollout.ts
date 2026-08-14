import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ActorIdentity,
  ContinuityAttempt,
  ContinuityEventRecord,
  ContinuityEvidence,
  ContinuityTask,
  EvidenceAuthority,
  EvidenceKind,
  EvidenceSource,
  EvidenceStatus,
  RepositoryContext,
} from '@ecuabyte/cortex-shared';
import type { ContinuityDashboardInput, ContinuityDashboardWorkspace } from './continuityDashboard';

interface RolloutRecord {
  type?: string;
  timestamp?: string;
  payload?: Record<string, unknown>;
}

interface CodexRolloutCacheEntry {
  modifiedAt: number;
  input: ContinuityDashboardInput;
}

export type CodexRolloutCache = Map<string, CodexRolloutCacheEntry>;

export function parseCodexRollout(
  text: string,
  workspace: ContinuityDashboardWorkspace
): ContinuityDashboardInput {
  const records = text
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const value = JSON.parse(line) as RolloutRecord;
        return value.payload && typeof value.payload === 'object' ? [value] : [];
      } catch {
        return [];
      }
    });

  const metadata = records.find((record) => record.type === 'session_meta');
  const metadataPayload = metadata?.payload;
  const cwd = stringValue(metadataPayload?.['cwd']);
  if (!cwd || normalizePath(cwd) !== normalizePath(workspace.root)) {
    return emptyInput(workspace);
  }

  const sessionId = stringValue(metadataPayload?.['session_id']) ?? 'unknown-codex-session';
  const git = recordValue(metadataPayload?.['git']);
  const repository: RepositoryContext = {
    root: cwd,
    ...(stringValue(git['repository_url']) ? { remote: stringValue(git['repository_url']) } : {}),
    ...(stringValue(git['branch']) ? { branch: stringValue(git['branch']) } : {}),
    ...(stringValue(git['commit_hash']) ? { commit: stringValue(git['commit_hash']) } : {}),
    worktree: cwd,
  };
  const agent: ActorIdentity = { harness: 'codex', sessionId };
  const eventRecords: ContinuityEventRecord[] = [];
  let objective = `Codex session in ${workspace.name}`;

  for (const [index, record] of records.entries()) {
    const payload = record.payload ?? {};
    const type = stringValue(payload['type']) ?? record.type;
    const timestamp = record.timestamp ?? new Date().toISOString();
    const event = projectRecord(payload, type, timestamp, index, sessionId, agent, repository);
    if (event) {
      eventRecords.push(event);
      if (type === 'user_message' && event.summary) objective = event.summary;
    }
  }

  if (eventRecords.length === 0) return emptyInput(workspace);

  const taskId = `codex:${sessionId}`;
  const attemptId = `codex-attempt:${sessionId}`;
  const createdAt = eventRecords[0]?.recordedAt ?? new Date().toISOString();
  const updatedAt = eventRecords[eventRecords.length - 1]?.recordedAt ?? createdAt;
  const task: ContinuityTask = {
    id: taskId,
    projectId: `local:${repository.root}`,
    objective,
    acceptanceCriteria: [],
    status: 'in_progress',
    repository,
    createdAt,
    updatedAt,
  };
  const attempt: ContinuityAttempt = {
    id: attemptId,
    taskId,
    actor: agent,
    status: 'active',
    startedAt: createdAt,
  };
  const events = eventRecords.map((event) => ({ ...event, taskId, attemptId }));
  const evidence = events
    .filter((event) => event.type !== 'session.started' && event.type !== 'session.idle')
    .map((event) => toEvidence(event, taskId, attemptId));

  return {
    workspace,
    tasks: [task],
    attempts: [attempt],
    evidence,
    events,
    handoffs: [],
  };
}

export function readCodexRollouts(
  sessionsPath: string,
  workspace: ContinuityDashboardWorkspace,
  cache: CodexRolloutCache = new Map()
): ContinuityDashboardInput {
  const files = findRolloutFiles(sessionsPath)
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
    .slice(0, 12);
  const projections = files.map(({ path, modifiedAt }) => {
    const cached = cache.get(path);
    if (cached?.modifiedAt === modifiedAt) return cached.input;
    const input = parseCodexRollout(readFileSync(path, 'utf8'), workspace);
    cache.set(path, { modifiedAt, input });
    return input;
  });

  const tasks = projections.flatMap((input) => input.tasks);
  const attempts = projections.flatMap((input) => input.attempts);
  const evidence = projections.flatMap((input) => input.evidence);
  const events = dedupeEvents(projections.flatMap((input) => input.events));
  return { workspace, tasks, attempts, evidence, events, handoffs: [] };
}

function projectRecord(
  payload: Record<string, unknown>,
  recordType: string | undefined,
  timestamp: string,
  index: number,
  sessionId: string,
  agent: ActorIdentity,
  repository: RepositoryContext
): ContinuityEventRecord | undefined {
  const type = recordType ?? stringValue(payload['type']);
  if (!type) return undefined;

  let eventType: ContinuityEventRecord['type'];
  let summary: string | undefined;
  let status: EvidenceStatus | undefined;
  let details: Record<string, unknown> | undefined;

  switch (type) {
    case 'session_meta':
      eventType = 'session.started';
      summary = 'Codex session started';
      break;
    case 'user_message':
      eventType = 'prompt.submitted';
      summary = truncate(stringValue(payload['message']) ?? 'Codex prompt submitted');
      break;
    case 'custom_tool_call':
    case 'function_call': {
      eventType = 'tool.completed';
      const name = stringValue(payload['name']) ?? 'Codex tool';
      summary = `${name} requested`;
      const toolStatus = stringValue(payload['status']);
      if (toolStatus === 'failed') status = 'failed';
      details = { tool: name };
      break;
    }
    case 'patch_apply_end': {
      eventType = 'file.changed';
      const changes = Array.isArray(payload['changes']) ? payload['changes'] : [];
      const paths = changes.flatMap((change) => {
        const item = recordValue(change);
        const path = stringValue(item['path']);
        return path ? [path] : [];
      });
      summary = paths.length > 0 ? `Changed files: ${paths.join(', ')}` : 'Changed project files';
      if (payload['success'] === false) status = 'failed';
      details = paths.length > 0 ? { files: paths } : undefined;
      break;
    }
    case 'web_search_end':
      eventType = 'tool.completed';
      summary = 'Web search completed';
      details = stringValue(payload['query'])
        ? { query: truncate(stringValue(payload['query']) ?? '', 160) }
        : undefined;
      break;
    case 'task_complete':
      eventType = 'session.idle';
      summary = 'Codex turn completed';
      break;
    case 'turn_aborted':
      eventType = 'tool.failed';
      summary = 'Codex turn aborted';
      status = 'failed';
      break;
    case 'context_compacted':
      eventType = 'compaction.started';
      summary = 'Codex context compacted';
      break;
    default:
      return undefined;
  }

  const eventId = `codex-rollout:${sessionId}:${index}:${type}`;
  return {
    eventId,
    type: eventType,
    sessionId,
    agent,
    repository,
    summary,
    ...(details ? { details } : {}),
    ...(status ? { status } : {}),
    occurredAt: timestamp,
    recordedAt: timestamp,
  };
}

function toEvidence(
  event: ContinuityEventRecord,
  taskId: string,
  attemptId: string
): ContinuityEvidence {
  const kind: EvidenceKind =
    event.type === 'file.changed'
      ? 'file_change'
      : event.type === 'prompt.submitted'
        ? 'observation'
        : 'command';
  const source: EvidenceSource = event.type === 'prompt.submitted' ? 'human' : 'tool';
  const status: EvidenceStatus = event.status ?? 'current';
  const authority: EvidenceAuthority = 'observed';
  return {
    id: `codex-evidence:${event.eventId}`,
    taskId,
    attemptId,
    kind,
    summary: event.summary ?? event.type,
    ...(event.details ? { details: event.details } : {}),
    source,
    authority,
    status,
    observedAt: event.occurredAt ?? event.recordedAt,
    recordedAt: event.recordedAt,
  };
}

function findRolloutFiles(root: string): Array<{ path: string; modifiedAt: number }> {
  if (!existsSync(root)) return [];
  const files: Array<{ path: string; modifiedAt: number }> = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        entry.isFile() &&
        entry.name.startsWith('rollout-') &&
        entry.name.endsWith('.jsonl')
      ) {
        try {
          files.push({ path, modifiedAt: statSync(path).mtimeMs });
        } catch {
          // Ignore rollouts being rotated or deleted while the agent is running.
        }
      }
    }
  };
  visit(root);
  return files;
}

function dedupeEvents(events: ContinuityEventRecord[]): ContinuityEventRecord[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (seen.has(event.eventId)) return false;
      seen.add(event.eventId);
      return true;
    })
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
}

function emptyInput(workspace: ContinuityDashboardWorkspace): ContinuityDashboardInput {
  return { workspace, tasks: [], attempts: [], evidence: [], events: [], handoffs: [] };
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function truncate(value: string, maxLength = 240): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}
