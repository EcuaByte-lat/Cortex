import { describe, expect, test } from 'bun:test';
import type { ContinuityDashboardSnapshot } from '../continuityDashboard';
import { selectDashboardTask } from '../dashboardCommands';

function createSnapshot(): ContinuityDashboardSnapshot {
  const repository = { root: 'C:/cortex' };
  return {
    workspace: { name: 'Cortex', root: repository.root },
    connection: 'live',
    activeTaskId: 'task-a',
    tasks: [
      {
        id: 'task-a',
        objective: 'Active task',
        acceptanceCriteria: [],
        status: 'working',
        repository,
        evidence: { current: 0, verified: 0, unverified: 0, failed: 0, stale: 0, conflicts: 0 },
        createdAt: '2026-08-14T12:00:00.000Z',
        updatedAt: '2026-08-14T12:00:00.000Z',
      },
      {
        id: 'task-b',
        objective: 'Selected task',
        acceptanceCriteria: [],
        status: 'waiting',
        repository,
        evidence: { current: 0, verified: 0, unverified: 0, failed: 0, stale: 0, conflicts: 0 },
        createdAt: '2026-08-14T12:00:00.000Z',
        updatedAt: '2026-08-14T12:00:00.000Z',
      },
    ],
    events: [],
    evidenceSummary: { current: 0, verified: 0, unverified: 0, failed: 0, stale: 0, conflicts: 0 },
    generatedAt: '2026-08-14T12:00:00.000Z',
  };
}

describe('dashboard command task selection', () => {
  test('uses the task explicitly selected by the dashboard', () => {
    const task = selectDashboardTask(createSnapshot(), 'task-b');

    expect(task?.id).toBe('task-b');
  });

  test('falls back to the active task for legacy commands without a task id', () => {
    const task = selectDashboardTask(createSnapshot());

    expect(task?.id).toBe('task-a');
  });
});
