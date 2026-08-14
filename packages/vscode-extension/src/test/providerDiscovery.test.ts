import { describe, expect, test } from 'bun:test';
import {
  buildCliInvocation,
  type DiscoveryHost,
  discoverCliProviders,
  getProviderCandidatesForSelection,
  parseCliOutput,
} from '../providerDiscovery';
import { FallbackModelAdapter } from '../providers/cli';

function createHost(overrides: Partial<DiscoveryHost> = {}): DiscoveryHost {
  return {
    env: {},
    homeDir: 'C:/Users/tester',
    resolveCommand: () => undefined,
    fileExists: () => false,
    ...overrides,
  };
}

describe('provider discovery', () => {
  test('detects authenticated CLI installations without reading credential contents', () => {
    const candidates = discoverCliProviders(
      createHost({
        resolveCommand: (command) =>
          command === 'codex'
            ? 'C:/bin/codex.exe'
            : command === 'claude'
              ? 'C:/bin/claude.exe'
              : undefined,
        fileExists: (path) =>
          path === 'C:/Users/tester/.codex/auth.json' || path === 'C:/Users/tester/.claude',
      })
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(['codex', 'claude']);
    expect(candidates.every((candidate) => candidate.status === 'authenticated')).toBe(true);
    expect(candidates.every((candidate) => !('credential' in candidate))).toBe(true);
  });

  test('keeps installed but unauthenticated CLIs out of the automatic selection set', () => {
    const candidates = discoverCliProviders(
      createHost({
        resolveCommand: (command) => (command === 'gemini' ? 'C:/bin/gemini.exe' : undefined),
      })
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.status).toBe('installed');
    expect(getProviderCandidatesForSelection(candidates)).toEqual([]);
  });

  test('honors explicit provider preference before readiness score', () => {
    const candidates = discoverCliProviders(
      createHost({
        resolveCommand: (command) =>
          command === 'codex' || command === 'claude' ? command : undefined,
        fileExists: (path) => path.endsWith('.codex/auth.json') || path.endsWith('.claude'),
      })
    );

    expect(getProviderCandidatesForSelection(candidates, 'claude')[0]?.id).toBe('claude');
    expect(getProviderCandidatesForSelection(candidates, 'auto')[0]?.id).toBe('codex');
  });

  test('builds non-interactive, read-only CLI invocations', () => {
    expect(buildCliInvocation('codex', 'Return only OK')).toEqual({
      command: 'codex',
      args: ['exec', '--json', '--sandbox', 'read-only', '--ephemeral', '-'],
      stdin: 'Return only OK',
    });
    expect(buildCliInvocation('claude', 'Return only OK')).toEqual({
      command: 'claude',
      args: ['-p', '--output-format', 'json', '--no-session-persistence', '--tools', ''],
      stdin: 'Return only OK',
    });
  });

  test('normalizes structured and plain CLI responses', () => {
    expect(
      parseCliOutput(
        'codex',
        '{"type":"item.completed","item":{"type":"agent_message","text":"OK"}}'
      )
    ).toBe('OK');
    expect(parseCliOutput('claude', '{"type":"result","result":"OK"}')).toBe('OK');
    expect(parseCliOutput('gemini', '{"response":"OK"}')).toBe('OK');
    expect(parseCliOutput('copilot', 'OK')).toBe('OK');
  });

  test('falls back to the next CLI when the preferred one is unavailable', async () => {
    const failed = {
      provider: 'codex' as const,
      name: 'Codex',
      async *sendRequest() {
        yield* [] as string[];
        throw new Error('expired session');
      },
    };
    const working = {
      provider: 'claude' as const,
      name: 'Claude',
      async *sendRequest() {
        yield 'OK';
      },
    };
    const adapter = new FallbackModelAdapter([failed, working]);
    const chunks: string[] = [];

    for await (const chunk of adapter.sendRequest([], {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => undefined }),
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['OK']);
    expect(adapter.name).toBe('Codex → Claude');
  });
});
