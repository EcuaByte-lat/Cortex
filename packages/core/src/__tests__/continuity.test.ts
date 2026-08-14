import { afterEach, describe, expect, test } from 'bun:test';
import {
  ContinuityStore,
  type RepositoryContext,
  renderContinuityHandoffMarkdown,
  type StartTaskInput,
} from '../index';

const stores: ContinuityStore[] = [];

function createStore(): ContinuityStore {
  const store = new ContinuityStore({ dbPath: ':memory:' });
  stores.push(store);
  return store;
}

function createStartInput(overrides: Partial<StartTaskInput> = {}): StartTaskInput {
  const repository: RepositoryContext = {
    root: 'C:/workspace/example',
    remote: 'https://github.com/example/project.git',
    branch: 'feature/continuity',
    commit: 'abc123',
  };

  return {
    projectId: 'github.com/example/project',
    objective: 'Implement resumable engineering handoffs',
    repository,
    actor: { harness: 'codex', model: 'gpt-5.5' },
    ...overrides,
  };
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('ContinuityStore', () => {
  test('starts a task with a durable task and attempt identity', async () => {
    const store = createStore();

    const started = await store.startTask(createStartInput());
    const resumed = await store.resume({ taskId: started.task.id });

    expect(started.task.id).toMatch(/^task_/);
    expect(started.attempt.id).toMatch(/^attempt_/);
    expect(started.task.status).toBe('in_progress');
    expect(resumed.task?.id).toBe(started.task.id);
    expect(resumed.attempt?.id).toBe(started.attempt.id);
  });

  test('captures evidence and projects it into a handoff', async () => {
    const store = createStore();
    const started = await store.startTask(createStartInput());

    await store.capture({
      taskId: started.task.id,
      attemptId: started.attempt.id,
      kind: 'decision',
      summary: 'Use an append-first event trail for continuity state',
      source: 'agent',
      authority: 'inferred',
    });
    await store.capture({
      taskId: started.task.id,
      attemptId: started.attempt.id,
      kind: 'test',
      summary: 'Continuity tests pass',
      source: 'ci',
      authority: 'verified',
    });

    const handoff = await store.createHandoff({
      taskId: started.task.id,
      attemptId: started.attempt.id,
      summary: 'The continuity domain is ready for the next integration step.',
      nextActions: ['Expose the lifecycle through MCP'],
    });

    expect(handoff.schemaVersion).toBe('0.1');
    expect(handoff.decisions).toHaveLength(1);
    expect(handoff.tests).toHaveLength(1);
    expect(handoff.nextActions).toEqual(['Expose the lifecycle through MCP']);
    expect(handoff.freshness).toBe('current');

    const markdown = renderContinuityHandoffMarkdown(handoff);
    expect(markdown).toContain(
      '# Cortex Handoff: The continuity domain is ready for the next integration step.'
    );
    expect(markdown).toContain('## Decisions');
    expect(markdown).toContain('Use an append-first event trail for continuity state');
    expect(markdown).toContain('## Next actions');
  });

  test('detects repository drift instead of silently resuming stale state', async () => {
    const store = createStore();
    const started = await store.startTask(createStartInput());

    const detected = await store.detect({
      taskId: started.task.id,
      repository: {
        root: 'C:/workspace/example',
        remote: 'https://github.com/example/project.git',
        branch: 'feature/continuity',
        commit: 'def456',
      },
    });

    expect(detected.taskId).toBe(started.task.id);
    expect(detected.stale).toBe(true);
    expect(detected.reasons).toContain('commit_changed');
  });

  test('records verification as evidence with verified authority', async () => {
    const store = createStore();
    const started = await store.startTask(createStartInput());

    const verification = await store.verify({
      taskId: started.task.id,
      attemptId: started.attempt.id,
      summary: 'The focused continuity test suite passed',
      source: 'ci',
    });

    expect(verification.kind).toBe('verification');
    expect(verification.authority).toBe('verified');
    expect(verification.status).toBe('current');
  });
});
