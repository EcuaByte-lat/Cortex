export type ProviderStatus = 'not-found' | 'installed' | 'configured' | 'authenticated' | 'ready';

export type CliProviderId = 'codex' | 'claude' | 'gemini' | 'copilot';

export interface CliProviderCandidate {
  id: CliProviderId;
  command: string;
  executable: string;
  status: ProviderStatus;
  authSources: string[];
}

export interface DiscoveryHost {
  env: Record<string, string | undefined>;
  homeDir: string;
  resolveCommand(command: string): string | undefined;
  fileExists(path: string): boolean;
}

interface CliDefinition {
  id: CliProviderId;
  command: string;
  authPaths: (homeDir: string) => string[];
  envKeys: string[];
}

const CLI_DEFINITIONS: CliDefinition[] = [
  {
    id: 'codex',
    command: 'codex',
    authPaths: (homeDir) => [pathFor(homeDir, '.codex', 'auth.json')],
    envKeys: ['OPENAI_API_KEY', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN'],
  },
  {
    id: 'claude',
    command: 'claude',
    authPaths: (homeDir) => [pathFor(homeDir, '.claude')],
    envKeys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
  },
  {
    id: 'gemini',
    command: 'gemini',
    authPaths: (homeDir) => [pathFor(homeDir, '.gemini')],
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'],
  },
  {
    id: 'copilot',
    command: 'copilot',
    authPaths: (homeDir) => [pathFor(homeDir, '.copilot')],
    envKeys: ['COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'],
  },
];

const CLI_PRIORITY: CliProviderId[] = ['codex', 'claude', 'copilot', 'gemini'];

function pathFor(homeDir: string, ...segments: string[]): string {
  return [homeDir.replace(/[\\/]+$/, ''), ...segments].join('/');
}

function isPresent(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Finds installed CLIs and reports only the source of authentication, never
 * the credential itself. A directory/file is only an authentication hint;
 * the adapter must still prove the provider works before caching `ready`.
 */
export function discoverCliProviders(host: DiscoveryHost): CliProviderCandidate[] {
  return CLI_DEFINITIONS.flatMap((definition) => {
    const executable = host.resolveCommand(definition.command);
    if (!executable) return [];

    const authSources = [
      ...definition
        .authPaths(host.homeDir)
        .filter((path) => host.fileExists(path))
        .map(() => 'user-auth-store'),
      ...definition.envKeys.filter((key) => isPresent(host.env[key])).map((key) => `env:${key}`),
    ];

    return [
      {
        id: definition.id,
        command: definition.command,
        executable,
        status: authSources.length > 0 ? 'authenticated' : 'installed',
        authSources,
      } satisfies CliProviderCandidate,
    ];
  });
}

export function getProviderCandidatesForSelection(
  candidates: CliProviderCandidate[],
  preferred: string = 'auto'
): CliProviderCandidate[] {
  const ready = candidates.filter(
    (candidate) => candidate.status === 'authenticated' || candidate.status === 'ready'
  );

  return ready.sort((left, right) => {
    if (preferred !== 'auto') {
      if (left.id === preferred) return -1;
      if (right.id === preferred) return 1;
    }

    return CLI_PRIORITY.indexOf(left.id) - CLI_PRIORITY.indexOf(right.id);
  });
}

export function getCliProviderIds(): CliProviderId[] {
  return [...CLI_PRIORITY];
}

export interface CliInvocation {
  command: string;
  args: string[];
  stdin: string;
}

export function buildCliInvocation(provider: CliProviderId, prompt: string): CliInvocation {
  switch (provider) {
    case 'codex':
      return {
        command: 'codex',
        args: ['exec', '--json', '--sandbox', 'read-only', '--ephemeral', '-'],
        stdin: prompt,
      };
    case 'claude':
      return {
        command: 'claude',
        args: ['-p', '--output-format', 'json', '--no-session-persistence', '--tools', ''],
        stdin: prompt,
      };
    case 'gemini':
      return {
        command: 'gemini',
        args: ['-p', '--output-format', 'json'],
        stdin: prompt,
      };
    case 'copilot':
      return {
        command: 'copilot',
        args: ['-p', '--no-banner'],
        stdin: prompt,
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === 'string' && field.trim() ? field : undefined;
}

export function parseCliOutput(provider: CliProviderId, output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of [...lines].reverse()) {
    try {
      const parsed: unknown = JSON.parse(line);

      if (provider === 'codex') {
        const item = isRecord(parsed) ? parsed.item : undefined;
        const message = stringField(item, 'text');
        if (message) return message;
      }

      const result = stringField(parsed, 'result') || stringField(parsed, 'response');
      if (result) return result;
    } catch {
      // Some CLIs intentionally mix human-readable lines with JSON events.
    }
  }

  return output.trim();
}
