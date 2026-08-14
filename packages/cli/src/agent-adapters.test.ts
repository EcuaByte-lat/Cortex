import { describe, expect, test } from 'bun:test';
import { normalizeAgentPayload } from './agent-adapters';

const repository = {
  root: 'C:/workspace/example',
  remote: 'https://github.com/example/project',
  branch: 'main',
  commit: 'abc123',
  worktree: 'C:/workspace/example',
};

describe('agent adapters', () => {
  test('normalizes a Codex file edit without capturing file contents', () => {
    const event = normalizeAgentPayload(
      'codex',
      {
        hook_event_name: 'PostToolUse',
        session_id: 'codex-session',
        tool_name: 'apply_patch',
        tool_input: {
          patch: '*** Update File: src/index.ts\n+secret=sk-12345678901234567890',
        },
        tool_response: { success: true },
      },
      repository
    );

    expect(event.type).toBe('file.changed');
    expect(event.evidenceKind).toBe('file_change');
    expect(event.summary).toContain('src/index.ts');
    expect(event.summary).not.toContain('secret=');
  });

  test('normalizes a Codex session start with a stable session identity', () => {
    const event = normalizeAgentPayload(
      'codex',
      {
        hook_event_name: 'SessionStart',
        session_id: 'codex-session',
        model: 'gpt-5.5',
        source: 'startup',
      },
      repository
    );

    expect(event.type).toBe('session.started');
    expect(event.sessionId).toBe('codex-session');
    expect(event.agent.harness).toBe('codex');
    expect(event.agent.model).toBe('gpt-5.5');
  });

  test('normalizes an OpenCode file event into file evidence', () => {
    const event = normalizeAgentPayload(
      'opencode',
      {
        type: 'file.edited',
        properties: {
          sessionID: 'opencode-session',
          filePath: 'src/bridge.ts',
        },
      },
      repository
    );

    expect(event.type).toBe('file.changed');
    expect(event.evidenceKind).toBe('file_change');
    expect(event.summary).toContain('src/bridge.ts');
  });
});
