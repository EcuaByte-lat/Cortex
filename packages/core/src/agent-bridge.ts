import {
  type AgentBridgeResult,
  type AgentEvent,
  type ContinuityAttempt,
  type ContinuityTask,
  type EvidenceKind,
  type RepositoryContext,
  SENSITIVE_DATA_FILTERS,
} from '@ecuabyte/cortex-shared';
import type { ContinuityStore } from './continuity';
import { ContextGuard } from './guard';

export interface AgentBridgeOptions {
  guard?: ContextGuard;
}

/**
 * Normalizes lifecycle events from coding-agent runtimes into the durable
 * continuity record. Adapters only need to produce AgentEvent values.
 */
export class AgentBridge {
  private readonly guard: ContextGuard;

  constructor(
    private readonly store: ContinuityStore,
    options: AgentBridgeOptions = {}
  ) {
    this.guard = options.guard ?? new ContextGuard();
  }

  async ingest(event: AgentEvent): Promise<AgentBridgeResult> {
    const recordedAt = new Date().toISOString();
    const accepted = await this.store.claimEvent({
      eventId: event.eventId,
      harness: event.agent.harness,
      sessionId: event.sessionId,
      eventType: event.type,
      recordedAt,
    });

    if (!accepted) {
      return {
        accepted: false,
        duplicate: true,
        task: null,
        attempt: null,
      };
    }

    const context = await this.resolveContext(event);
    if (!context.task || !context.attempt) {
      return {
        accepted: true,
        duplicate: false,
        task: null,
        attempt: null,
      };
    }

    if (isCheckpointEvent(event.type)) {
      const attempt =
        event.type === 'session.ended'
          ? await this.store.endAttempt(context.attempt.id)
          : context.attempt;
      const handoff = await this.store.createHandoff({
        taskId: context.task.id,
        attemptId: attempt?.id ?? context.attempt.id,
        ...(event.summary ? { summary: this.redact(event.summary) } : {}),
        nextActions: nextActionsFrom(event.details),
      });

      return {
        accepted: true,
        duplicate: false,
        task: context.task,
        attempt: attempt ?? context.attempt,
        handoff,
      };
    }

    if (event.type === 'session.started') {
      return {
        accepted: true,
        duplicate: false,
        task: context.task,
        attempt: context.attempt,
      };
    }

    const evidence = await this.store.capture({
      taskId: context.task.id,
      attemptId: context.attempt.id,
      kind: event.evidenceKind ?? inferEvidenceKind(event),
      summary: this.redact(event.summary ?? event.type),
      ...(event.details ? { details: this.redactRecord(event.details) } : {}),
      source: event.source ?? 'tool',
      authority: event.authority ?? 'observed',
      status: event.status ?? (event.type === 'tool.failed' ? 'failed' : 'current'),
      ...(event.occurredAt ? { observedAt: event.occurredAt } : {}),
    });

    return {
      accepted: true,
      duplicate: false,
      task: context.task,
      attempt: context.attempt,
      evidence,
    };
  }

  private async resolveContext(
    event: AgentEvent
  ): Promise<{ task: ContinuityTask | null; attempt: ContinuityAttempt | null }> {
    const objective = event.objective ? this.redact(event.objective) : undefined;
    let task = event.taskId
      ? await this.store.getTaskById(event.taskId)
      : await this.store.findActiveTask(event.repository);

    if (!task && objective) {
      const started = await this.store.startTask({
        projectId: event.projectId ?? deriveProjectId(event.repository),
        objective,
        repository: event.repository,
        actor: actorFor(event),
        ...(event.taskId ? { taskId: event.taskId } : {}),
      });
      task = started.task;
      return { task, attempt: started.attempt };
    }

    if (!task) return { task: null, attempt: null };

    let attempt = event.attemptId
      ? await this.store.getAttemptById(event.attemptId)
      : await this.store.findAttemptBySession(task.id, event.sessionId);

    if (!attempt) {
      const started = await this.store.startTask({
        projectId: task.projectId,
        objective: task.objective,
        repository: event.repository,
        actor: actorFor(event),
        taskId: task.id,
      });
      attempt = started.attempt;
    }

    return { task, attempt };
  }

  private redact(value: string): string {
    return this.guard.guard(value, {
      filters: [...SENSITIVE_DATA_FILTERS],
      mode: 'redact',
    }).content;
  }

  private redactRecord(value: Record<string, unknown>): Record<string, unknown> {
    return redactValue(value, (text) => this.redact(text)) as Record<string, unknown>;
  }
}

function actorFor(event: AgentEvent): AgentEvent['agent'] {
  return { ...event.agent, sessionId: event.sessionId };
}

function inferEvidenceKind(event: AgentEvent): EvidenceKind {
  switch (event.type) {
    case 'file.changed':
      return 'file_change';
    case 'command.completed':
      return 'command';
    default:
      return 'observation';
  }
}

function isCheckpointEvent(type: AgentEvent['type']): boolean {
  return type === 'compaction.started' || type === 'session.idle' || type === 'session.ended';
}

function nextActionsFrom(details: Record<string, unknown> | undefined): string[] {
  const value = details?.['nextActions'];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function deriveProjectId(repository: RepositoryContext): string {
  if (repository.remote) {
    try {
      const url = new URL(repository.remote);
      return `${url.host}${url.pathname}`.replace(/\/+$/, '');
    } catch {
      return repository.remote.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }
  }

  return `local:${repository.root}`;
}

function redactValue(value: unknown, redact: (text: string) => string): unknown {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, redact));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactValue(item, redact)])
    );
  }
  return value;
}
