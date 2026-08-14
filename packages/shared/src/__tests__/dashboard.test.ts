import { describe, expect, test } from 'bun:test';
import { buildContinuityDashboardSnapshot, type ContinuityDashboardInput } from '../dashboard';

describe('shared dashboard projection', () => {
  test('preserves task acceptance criteria and event provenance for every host', () => {
    const input = {
      workspace: { name: 'Cortex', root: 'C:/workspace/cortex' },
      tasks: [
        {
          id: 'task-a',
          projectId: 'local:cortex',
          objective: 'Ship the cockpit',
          acceptanceCriteria: ['Selection survives refresh'],
          status: 'in_progress',
          repository: { root: 'C:/workspace/cortex', branch: 'main' },
          createdAt: '2026-08-14T12:00:00.000Z',
          updatedAt: '2026-08-14T12:00:00.000Z',
        },
      ],
      attempts: [],
      evidence: [],
      events: [
        {
          eventId: 'event-a',
          type: 'command.completed',
          sessionId: 'session-a',
          agent: { harness: 'ci' },
          repository: { root: 'C:/workspace/cortex', branch: 'main' },
          taskId: 'task-a',
          summary: 'Focused tests pass',
          source: 'ci',
          authority: 'verified',
          occurredAt: '2026-08-14T12:00:00.000Z',
          recordedAt: '2026-08-14T12:00:00.000Z',
        },
      ],
      handoffs: [],
      now: '2026-08-14T12:00:01.000Z',
    } as ContinuityDashboardInput;

    const snapshot = buildContinuityDashboardSnapshot(input);

    expect(snapshot.tasks[0]?.acceptanceCriteria).toEqual(['Selection survives refresh']);
    expect(snapshot.events[0]?.source).toBe('ci');
    expect(snapshot.events[0]?.authority).toBe('verified');
  });
});
