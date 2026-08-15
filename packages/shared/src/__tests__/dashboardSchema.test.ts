import { describe, expect, test } from 'bun:test';
import { dashboardCommandSchema, dashboardSnapshotSchema } from '../dashboardSchema';

describe('dashboard wire schemas', () => {
  test('accepts a handoff command with an explicit selected task', () => {
    const result = dashboardCommandSchema.safeParse({
      type: 'copyHandoff',
      data: { taskId: 'task-b' },
    });

    expect(result.success).toBe(true);
  });

  test('rejects a handoff command without a task id', () => {
    const result = dashboardCommandSchema.safeParse({
      type: 'copyHandoff',
      data: { taskId: '' },
    });

    expect(result.success).toBe(false);
  });

  test('rejects a snapshot with malformed tasks instead of passing unknown data through', () => {
    const result = dashboardSnapshotSchema.safeParse({
      workspace: { name: 'Cortex', root: 'C:/workspace/cortex' },
      connection: 'live',
      tasks: [{ id: 'task-a' }],
      events: [],
      evidenceSummary: {
        current: 0,
        verified: 0,
        unverified: 0,
        failed: 0,
        stale: 0,
        conflicts: 0,
      },
      generatedAt: '2026-08-14T12:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});
