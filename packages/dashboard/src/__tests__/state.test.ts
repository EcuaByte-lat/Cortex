import { describe, expect, test } from 'bun:test';
import { createDashboardStore } from '../state';

function snapshot(
  activeTaskId: string | undefined,
  taskIds: string[],
  eventIds: Array<{ id: string; taskId: string }>
) {
  return {
    workspace: { name: 'Cortex', root: 'C:/workspace/cortex' },
    connection: 'live',
    activeTaskId,
    tasks: taskIds.map((id) => ({
      id,
      objective: `Task ${id}`,
      status: 'working',
      repository: { root: 'C:/workspace/cortex' },
      createdAt: '2026-08-14T12:00:00.000Z',
      updatedAt: '2026-08-14T12:00:00.000Z',
      evidence: { current: 0, verified: 0, unverified: 0, failed: 0, stale: 0, conflicts: 0 },
    })),
    events: eventIds.map(({ id, taskId }) => ({
      id,
      kind: 'command',
      type: 'command.completed',
      summary: `Event ${id}`,
      status: 'observed',
      timestamp: '2026-08-14T12:00:00.000Z',
      taskId,
      agent: { harness: 'test' },
      repository: { root: 'C:/workspace/cortex' },
    })),
    evidenceSummary: { current: 0, verified: 0, unverified: 0, failed: 0, stale: 0, conflicts: 0 },
    generatedAt: '2026-08-14T12:00:00.000Z',
  };
}

describe('dashboard store', () => {
  test('preserves a manually selected task when a live snapshot changes active task', () => {
    const store = createDashboardStore();
    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot('task-a', ['task-a', 'task-b'], [{ id: 'event-a', taskId: 'task-a' }]),
    });
    store.dispatch({ type: 'selectTask', taskId: 'task-b' });

    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot('task-a', ['task-a', 'task-b'], [{ id: 'event-a', taskId: 'task-a' }]),
    });

    expect(store.getState().selectedTaskId).toBe('task-b');
  });

  test('falls back to the snapshot active task when the selected task disappears', () => {
    const store = createDashboardStore();
    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot('task-a', ['task-a', 'task-b'], [{ id: 'event-b', taskId: 'task-b' }]),
    });
    store.dispatch({ type: 'selectTask', taskId: 'task-b' });

    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot('task-a', ['task-a'], [{ id: 'event-a', taskId: 'task-a' }]),
    });

    expect(store.getState().selectedTaskId).toBe('task-a');
    expect(store.getState().selectedEventId).toBe('event-a');
  });

  test('clears an event selection when selecting a different task', () => {
    const store = createDashboardStore();
    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot(
        'task-a',
        ['task-a', 'task-b'],
        [
          { id: 'event-a', taskId: 'task-a' },
          { id: 'event-b', taskId: 'task-b' },
        ]
      ),
    });
    store.dispatch({ type: 'selectEvent', eventId: 'event-a' });
    store.dispatch({ type: 'selectTask', taskId: 'task-b' });

    expect(store.getState().selectedTaskId).toBe('task-b');
    expect(store.getState().selectedEventId).toBe('event-b');
  });

  test('clears stale selections when the hydrated task has no events', () => {
    const store = createDashboardStore();
    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot(
        'task-a',
        ['task-a', 'task-b'],
        [
          { id: 'event-a', taskId: 'task-a' },
          { id: 'event-b', taskId: 'task-b' },
        ]
      ),
    });
    store.dispatch({ type: 'selectEvent', eventId: 'event-b' });

    store.dispatch({
      type: 'hydrate',
      snapshot: snapshot('task-a', ['task-a'], []),
    });

    expect(store.getState().selectedTaskId).toBe('task-a');
    expect(store.getState().selectedEventId).toBeUndefined();
  });
});
