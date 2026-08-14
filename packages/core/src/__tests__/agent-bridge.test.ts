import { afterEach, describe, expect, test } from 'bun:test';
import { AgentBridge, type AgentEvent, ContinuityStore } from '../index';

const stores: ContinuityStore[] = [];

function createStore(): ContinuityStore {
  const store = new ContinuityStore({ dbPath: ':memory:' });
  stores.push(store);
  return store;
}

function createPromptEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    eventId: 'event-1',
    type: 'prompt.submitted',
    sessionId: 'session-1',
    agent: { harness: 'codex', model: 'gpt-5.5', sessionId: 'session-1' },
    repository: {
      root: 'C:/workspace/example',
      remote: 'https://github.com/example/project',
      branch: 'feature/bridge',
      commit: 'abc123',
      worktree: 'C:/workspace/example',
    },
    objective: 'Implement agent continuity',
    summary: 'Implement continuity with api_key=sk-12345678901234567890',
    occurredAt: '2026-08-14T12:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('AgentBridge', () => {
  test('starts a task from a prompt and redacts secrets before persisting evidence', async () => {
    const store = createStore();
    const bridge = new AgentBridge(store);

    const result = await bridge.ingest(createPromptEvent());

    expect(result.accepted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.task?.objective).toBe('Implement agent continuity');
    expect(result.evidence?.summary).toContain('[REDACTED]');
    expect(result.evidence?.summary).not.toContain('sk-12345678901234567890');

    const events = await store.listEventLog();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('prompt.submitted');
    expect(events[0]?.summary).toContain('[REDACTED]');
    expect(events[0]?.summary).not.toContain('sk-12345678901234567890');
    expect(events[0]?.taskId).toBe(result.task?.id);
    expect(events[0]?.attemptId).toBe(result.attempt?.id);
  });

  test('reuses the task and attempt for a session and checkpoints when it becomes idle', async () => {
    const store = createStore();
    const bridge = new AgentBridge(store);

    const started = await bridge.ingest(createPromptEvent());
    const changed = await bridge.ingest(
      createPromptEvent({
        eventId: 'event-2',
        type: 'file.changed',
        summary: 'Updated packages/core/src/agent-bridge.ts',
        evidenceKind: 'file_change',
      })
    );
    const idle = await bridge.ingest(
      createPromptEvent({
        eventId: 'event-3',
        type: 'session.idle',
        summary: 'Waiting for the next safe action',
        details: { nextActions: ['Run the focused continuity tests'] },
      })
    );

    expect(changed.task?.id).toBe(started.task?.id);
    expect(changed.attempt?.id).toBe(started.attempt?.id);
    expect(changed.evidence?.kind).toBe('file_change');
    expect(idle.handoff?.task.id).toBe(started.task?.id);
    expect(idle.handoff?.nextActions).toEqual(['Run the focused continuity tests']);
  });

  test('ends the active attempt after creating a final session handoff', async () => {
    const store = createStore();
    const bridge = new AgentBridge(store);

    const started = await bridge.ingest(createPromptEvent());
    const ended = await bridge.ingest(
      createPromptEvent({
        eventId: 'event-2',
        type: 'session.ended',
        summary: 'Session ended after the implementation checkpoint',
      })
    );

    expect(ended.handoff).toBeDefined();
    expect(ended.attempt?.id).toBe(started.attempt?.id);
    expect(ended.attempt?.status).toBe('ended');
    expect(ended.handoff?.attempt.status).toBe('ended');
  });
});
