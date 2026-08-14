import { describe, expect, test } from 'bun:test';
import { parseCodexRollout } from '../codexRollout';

const workspace = { name: 'Cortex', root: 'C:/QuirozAI/Cortex' };

function line(timestamp: string, payload: Record<string, unknown>, type = 'event_msg'): string {
  return JSON.stringify({ type, timestamp, payload });
}

describe('Codex rollout projection', () => {
  test('projects VS Code Codex messages and tools into a live continuity task', () => {
    const text = [
      line(
        '2026-08-14T23:20:00.000Z',
        {
          session_id: 'codex-session-1',
          cwd: 'C:/QuirozAI/Cortex',
          originator: 'codex_vscode',
          git: {
            branch: 'main',
            commit_hash: 'abc123',
            repository_url: 'https://github.com/test/repo',
          },
        },
        'session_meta'
      ),
      line('2026-08-14T23:20:01.000Z', {
        type: 'user_message',
        message: 'Build the continuity dashboard',
      }),
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-08-14T23:20:02.000Z',
        payload: {
          type: 'custom_tool_call',
          call_id: 'call-1',
          name: 'exec',
          status: 'completed',
          input: '{"cmd":"bun test"}',
        },
      }),
      line(
        '2026-08-14T23:20:03.000Z',
        {
          success: true,
          changes: [{ path: 'src/dashboard.ts', kind: 'update' }],
        },
        'patch_apply_end'
      ),
      line('2026-08-14T23:20:04.000Z', {}, 'task_complete'),
    ].join('\n');

    const result = parseCodexRollout(text, workspace);

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]?.objective).toBe('Build the continuity dashboard');
    expect(result.tasks[0]?.repository.branch).toBe('main');
    expect(result.attempts[0]?.actor.harness).toBe('codex');
    expect(result.events.map((event) => event.type)).toEqual([
      'session.started',
      'prompt.submitted',
      'tool.completed',
      'file.changed',
      'session.idle',
    ]);
    expect(result.events.find((event) => event.type === 'file.changed')?.summary).toContain(
      'src/dashboard.ts'
    );
  });

  test('ignores rollouts from another workspace', () => {
    const text = line(
      '2026-08-14T23:20:00.000Z',
      {
        session_id: 'other-session',
        cwd: 'C:/other-project',
        originator: 'codex_vscode',
      },
      'session_meta'
    );

    expect(parseCodexRollout(text, workspace).tasks).toHaveLength(0);
  });
});
