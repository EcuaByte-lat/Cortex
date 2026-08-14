import { spawn } from 'node:child_process';
import type * as vscode from 'vscode';
import {
  buildCliInvocation,
  type CliProviderCandidate,
  parseCliOutput,
} from '../providerDiscovery';
import type { ModelAdapter } from './index';

type CliAdapterProvider = 'codex' | 'claude' | 'gemini-cli' | 'copilot';

const DISPLAY_NAMES: Record<CliAdapterProvider, string> = {
  codex: 'OpenAI Codex CLI',
  claude: 'Claude Code CLI',
  'gemini-cli': 'Gemini CLI',
  copilot: 'GitHub Copilot CLI',
};

function promptFromMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  return messages
    .map((message) => `${message.role.toUpperCase()} MESSAGE:\n${message.content}`)
    .join('\n\n');
}

function cliProviderId(provider: CliAdapterProvider): 'codex' | 'claude' | 'gemini' | 'copilot' {
  return provider === 'gemini-cli' ? 'gemini' : provider;
}

export class CliModelAdapter implements ModelAdapter {
  readonly provider: CliAdapterProvider;
  readonly name: string;

  constructor(
    private readonly candidate: CliProviderCandidate,
    private readonly workspacePath: string,
    provider: CliAdapterProvider = candidate.id === 'gemini' ? 'gemini-cli' : candidate.id
  ) {
    this.provider = provider;
    this.name = DISPLAY_NAMES[provider];
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const invocation = buildCliInvocation(
      cliProviderId(this.provider),
      promptFromMessages(messages)
    );
    const child = spawn(this.candidate.executable, invocation.args, {
      cwd: this.workspacePath,
      env: {
        ...process.env,
        CI: '1',
        NO_COLOR: '1',
      },
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => child.kill(), 120_000);
    const cancellation = token.onCancellationRequested(() => child.kill());

    try {
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        child.stdout.on('data', (chunk: Buffer | string) => {
          stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk: Buffer | string) => {
          stderr += chunk.toString();
        });
        child.once('error', reject);
        child.once('close', (code) => {
          settled = true;
          resolve(code);
        });
        child.stdin.end(invocation.stdin);
      });

      if (token.isCancellationRequested) throw new Error('CLI provider request cancelled');
      if (!settled || exitCode !== 0) {
        throw new Error(
          `${this.name} exited with code ${exitCode ?? 'unknown'}${stderr ? ' (see diagnostics)' : ''}`
        );
      }

      const response = parseCliOutput(cliProviderId(this.provider), stdout);
      if (!response) throw new Error(`${this.name} returned an empty response`);
      yield response;
    } finally {
      clearTimeout(timeout);
      cancellation.dispose();
      if (!settled) child.kill();
    }
  }
}

export class FallbackModelAdapter implements ModelAdapter {
  readonly provider: ModelAdapter['provider'];
  readonly name: string;

  constructor(private readonly adapters: ModelAdapter[]) {
    if (adapters.length === 0) throw new Error('At least one fallback adapter is required');
    this.provider = adapters[0].provider;
    this.name = adapters.map((adapter) => adapter.name.replace(/ CLI$/, '')).join(' → ');
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    let failures = 0;

    for (const adapter of this.adapters) {
      if (token.isCancellationRequested) throw new Error('CLI provider request cancelled');

      try {
        const chunks: string[] = [];
        for await (const chunk of adapter.sendRequest(messages, token)) chunks.push(chunk);
        if (chunks.length === 0) throw new Error('empty response');
        yield* chunks;
        return;
      } catch {
        failures++;
      }
    }

    throw new Error(`No CLI provider responded (${failures} attempted)`);
  }
}
