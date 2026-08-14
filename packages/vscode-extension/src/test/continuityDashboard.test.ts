import { describe, expect, test } from 'bun:test';
import {
  buildContinuityDashboardSnapshot,
  type ContinuityDashboardInput,
} from '../continuityDashboard';

const base: ContinuityDashboardInput = {
  workspace: { name: 'Cortex', root: 'C:/workspace/cortex' },
  tasks: [
    {
      id: 'task_1',
      projectId: 'local:cortex',
      objective: 'Ship the continuity cockpit',
      acceptanceCriteria: [],
      status: 'in_progress',
      repository: { root: 'C:/workspace/cortex', branch: 'main', commit: 'abc123' },
      createdAt: '2026-08-14T12:00:00.000Z',
      updatedAt: '2026-08-14T12:03:00.000Z',
    },
  ],
  attempts: [
    {
      id: 'attempt_1',
      taskId: 'task_1',
      actor: { harness: 'codex', model: 'gpt-5.5', sessionId: 'session_1' },
      status: 'active',
      startedAt: '2026-08-14T12:00:00.000Z',
    },
  ],
  evidence: [
    {
      id: 'evidence_1',
      taskId: 'task_1',
      attemptId: 'attempt_1',
      kind: 'test',
      summary: 'Focused tests pass',
      source: 'ci',
      authority: 'verified',
      status: 'current',
      observedAt: '2026-08-14T12:03:00.000Z',
      recordedAt: '2026-08-14T12:03:00.000Z',
    },
  ],
  events: [
    {
      eventId: 'event_1',
      type: 'command.completed',
      sessionId: 'session_1',
      agent: { harness: 'codex', model: 'gpt-5.5', sessionId: 'session_1' },
      repository: { root: 'C:/workspace/cortex', branch: 'main', commit: 'abc123' },
      taskId: 'task_1',
      attemptId: 'attempt_1',
      summary: 'bun test packages/core',
      occurredAt: '2026-08-14T12:03:00.000Z',
      recordedAt: '2026-08-14T12:03:01.000Z',
    },
  ],
  handoffs: [],
  now: '2026-08-14T12:03:05.000Z',
};

describe('Continuity dashboard snapshot', () => {
  test('selects the active task and summarizes evidence health', () => {
    const snapshot = buildContinuityDashboardSnapshot(base);

    expect(snapshot.activeTaskId).toBe('task_1');
    expect(snapshot.tasks[0]?.latestEvent?.kind).toBe('command');
    expect(snapshot.tasks[0]?.latestEvent?.summary).toBe('bun test packages/core');
    expect(snapshot.evidenceSummary).toEqual({
      current: 1,
      verified: 1,
      unverified: 0,
      failed: 0,
      stale: 0,
      conflicts: 0,
    });
    expect(snapshot.connection).toBe('live');
  });

  test('marks a task stale when the last event is older than the live window', () => {
    const snapshot = buildContinuityDashboardSnapshot({
      ...base,
      events: base.events.map((event) => ({
        ...event,
        occurredAt: '2026-08-14T11:59:00.000Z',
        recordedAt: '2026-08-14T11:59:00.000Z',
      })),
      now: '2026-08-14T12:03:05.000Z',
    });

    expect(snapshot.connection).toBe('stale');
    expect(snapshot.tasks[0]?.status).toBe('waiting');
  });
});
