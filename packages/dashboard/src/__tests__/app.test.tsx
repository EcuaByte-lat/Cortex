import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardApp } from '../react';
import { createDashboardStore } from '../state';

describe('dashboard app', () => {
  test('renders task criteria and event provenance from the shared snapshot', () => {
    const store = createDashboardStore<any>();
    store.dispatch({
      type: 'hydrate',
      snapshot: {
        workspace: { name: 'Cortex', root: 'C:/workspace/cortex' },
        connection: 'live',
        activeTaskId: 'task-a',
        tasks: [
          {
            id: 'task-a',
            objective: 'Ship the cockpit',
            acceptanceCriteria: ['Selection survives refresh'],
            status: 'working',
            repository: { root: 'C:/workspace/cortex', branch: 'main' },
            createdAt: '2026-08-14T12:00:00.000Z',
            updatedAt: '2026-08-14T12:00:00.000Z',
            evidence: {
              current: 1,
              verified: 1,
              unverified: 0,
              failed: 0,
              stale: 0,
              conflicts: 0,
            },
          },
        ],
        events: [
          {
            id: 'event-a',
            kind: 'command',
            type: 'command.completed',
            summary: 'Focused tests pass',
            status: 'observed',
            source: 'ci',
            authority: 'verified',
            timestamp: '2026-08-14T12:00:00.000Z',
            taskId: 'task-a',
            agent: { harness: 'ci' },
            repository: { root: 'C:/workspace/cortex', branch: 'main' },
          },
        ],
        evidenceSummary: {
          current: 1,
          verified: 1,
          unverified: 0,
          failed: 0,
          stale: 0,
          conflicts: 0,
        },
        generatedAt: '2026-08-14T12:00:01.000Z',
      },
    });

    const markup = renderToStaticMarkup(<DashboardApp store={store} />);

    expect(markup).toContain('Selection survives refresh');
    expect(markup).toContain('Focused tests pass');
    expect(markup).toContain('ci');
    expect(markup).toContain('verified');
  });
});
