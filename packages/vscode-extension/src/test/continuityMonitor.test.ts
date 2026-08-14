import { describe, expect, test } from 'bun:test';
import {
  type ContinuityQueryAdapter,
  parseContinuityEventJournal,
  readContinuityRows,
} from '../continuityMonitor';

describe('Continuity monitor row reader', () => {
  test('parses valid journal lines and ignores malformed or blank lines', () => {
    const event = {
      eventId: 'event_1',
      type: 'session.started' as const,
      sessionId: 'session_1',
      agent: { harness: 'codex' },
      repository: { root: 'C:/cortex' },
      recordedAt: '2026-08-14T12:00:00.000Z',
    };
    const events = parseContinuityEventJournal(`${JSON.stringify(event)}\nnot-json\n\n`);

    expect(events).toEqual([event]);
  });

  test('reads task, attempt, evidence, event and handoff rows from the local store', async () => {
    const adapter: ContinuityQueryAdapter = {
      query<T>(table: string): T[] {
        const rows: Record<string, unknown[]> = {
          continuity_tasks: [
            {
              id: 'task_1',
              project_id: 'local:cortex',
              objective: 'Ship dashboard',
              acceptance_criteria: '[]',
              status: 'in_progress',
              repository: '{"root":"C:/cortex","branch":"main"}',
              created_at: '2026-08-14T12:00:00.000Z',
              updated_at: '2026-08-14T12:01:00.000Z',
            },
          ],
          continuity_attempts: [
            {
              id: 'attempt_1',
              task_id: 'task_1',
              actor: '{"harness":"codex","sessionId":"session_1"}',
              status: 'active',
              started_at: '2026-08-14T12:00:00.000Z',
              ended_at: null,
            },
          ],
          continuity_evidence: [],
          continuity_event_log: [],
          continuity_handoffs: [],
        };
        return (rows[table] ?? []) as T[];
      },
    };

    const result = await readContinuityRows(adapter);

    expect(result.tasks[0]?.objective).toBe('Ship dashboard');
    expect(result.attempts[0]?.actor.harness).toBe('codex');
  });
});
