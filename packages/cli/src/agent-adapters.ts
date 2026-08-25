import { createHash } from 'node:crypto';
import type {
  AgentEvent,
  AgentEventType,
  EvidenceKind,
  RepositoryContext,
} from '@ecuabyte/cortex-shared';

export type AgentProvider = 'codex' | 'opencode' | 'claude' | 'cursor' | 'gemini' | 'git';

export function normalizeAgentPayload(
  provider: AgentProvider,
  payload: Record<string, unknown>,
  repository: RepositoryContext
): AgentEvent {
  const properties = record(payload['properties']);
  const nativeType =
    stringValue(payload['hook_event_name']) ?? stringValue(payload['type']) ?? 'unknown';
  const sessionId =
    stringValue(payload['session_id']) ??
    stringValue(payload['sessionId']) ??
    stringValue(properties['sessionID']) ??
    'unknown-session';
  const type = normalizeEventType(provider, nativeType, payload);
  const toolName =
    stringValue(payload['tool_name']) ??
    stringValue(payload['toolName']) ??
    stringValue(properties['tool']) ??
    undefined;
  const toolInput = record(payload['tool_input'] ?? payload['toolInput'] ?? properties['input']);
  const summary = summarize(type, payload, properties, toolName, toolInput);
  const event: AgentEvent = {
    eventId: eventId(provider, nativeType, sessionId, payload, properties),
    type,
    sessionId,
    agent: {
      harness: provider,
      ...(stringValue(payload['model']) ? { model: stringValue(payload['model']) } : {}),
      ...(stringValue(payload['version']) ? { version: stringValue(payload['version']) } : {}),
      sessionId,
    },
    repository,
    ...(summary ? { summary } : {}),
    ...(type === 'prompt.submitted' && summary ? { objective: summary } : {}),
    ...(toolName ? { details: { toolName } } : {}),
    ...(evidenceKindFor(type, toolName) ? { evidenceKind: evidenceKindFor(type, toolName) } : {}),
    ...(provider === 'git'
      ? { source: 'git', authority: 'observed' }
      : type === 'prompt.submitted'
        ? { source: 'human' }
        : { source: 'tool' }),
    ...(stringValue(payload['timestamp']) ? { occurredAt: stringValue(payload['timestamp']) } : {}),
  };

  return event;
}

function normalizeEventType(
  provider: AgentProvider,
  nativeType: string,
  payload: Record<string, unknown>
): AgentEventType {
  if (provider === 'git') {
    return 'command.completed';
  }

  if (provider === 'opencode') {
    switch (nativeType) {
      case 'session.created':
        return 'session.started';
      case 'session.idle':
        return 'session.idle';
      case 'session.compacted':
      case 'experimental.session.compacting':
        return 'compaction.started';
      case 'session.deleted':
        return 'session.ended';
      case 'file.edited':
      case 'file.watcher.updated':
        return 'file.changed';
      case 'command.executed':
        return 'command.completed';
      case 'tui.prompt.append':
        return 'prompt.submitted';
      case 'tool.execute.after':
        return 'tool.completed';
      case 'tool.execute.before':
        return 'tool.completed';
      default:
        return 'tool.completed';
    }
  }

  switch (nativeType) {
    case 'SessionStart':
      return 'session.started';
    case 'UserPromptSubmit':
      return 'prompt.submitted';
    case 'PostToolUse':
      return toolIsFileEdit(payload) ? 'file.changed' : 'tool.completed';
    case 'PostToolUseFailure':
      return 'tool.failed';
    case 'PreCompact':
    case 'PostCompact':
      return 'compaction.started';
    case 'Stop':
      return 'session.idle';
    case 'SessionEnd':
      return 'session.ended';
    default:
      return 'tool.completed';
  }
}

function evidenceKindFor(
  type: AgentEventType,
  toolName: string | undefined
): EvidenceKind | undefined {
  if (type === 'file.changed') return 'file_change';
  if (type === 'command.completed') return 'command';
  if (type === 'tool.completed' || type === 'tool.failed') {
    if (toolName && /test|check|lint|typecheck/i.test(toolName)) return 'test';
    return 'observation';
  }
  if (type === 'prompt.submitted') return 'observation';
  return undefined;
}

function gitSummary(nativeType: string, payload: Record<string, unknown>): string | undefined {
  const commit = stringValue(payload['commit']) ?? stringValue(payload['newRef']);
  if (commit) return `Git ${nativeType}: ${commit}`;
  return nativeType ? `Git ${nativeType}` : undefined;
}

function summarize(
  type: AgentEventType,
  payload: Record<string, unknown>,
  properties: Record<string, unknown>,
  toolName: string | undefined,
  toolInput: Record<string, unknown>
): string | undefined {
  if (type === 'prompt.submitted') {
    return (
      stringValue(payload['prompt']) ??
      stringValue(payload['prompt_text']) ??
      stringValue(payload['text']) ??
      stringValue(properties['prompt']) ??
      'Agent prompt submitted'
    );
  }

  if (payload['provider'] === 'git' || payload['hook']) {
    return gitSummary(
      stringValue(payload['type']) ?? stringValue(payload['hook']) ?? 'event',
      payload
    );
  }

  const filePath =
    stringValue(payload['file_path']) ??
    stringValue(payload['filePath']) ??
    stringValue(properties['filePath']) ??
    stringValue(toolInput['file_path']) ??
    stringValue(toolInput['filePath']);
  if (type === 'file.changed') {
    if (filePath) return `Changed file ${filePath}`;
    const patch = stringValue(toolInput['patch']) ?? stringValue(properties['patch']);
    const files = patch
      ? [...patch.matchAll(/\*\*\* (?:Update|Add|Delete) File: ([^\r\n]+)/g)]
      : [];
    return files.length > 0
      ? `Changed files: ${files.map((match) => match[1]).join(', ')}`
      : 'Changed project files';
  }

  const command =
    stringValue(payload['command']) ??
    stringValue(properties['command']) ??
    stringValue(toolInput['command']) ??
    stringValue(toolInput['cmd']);
  if (type === 'command.completed')
    return command ? `Ran command: ${command}` : 'Command completed';
  if (toolName) return `${toolName} completed`;
  return type === 'session.started' ? 'Agent session started' : undefined;
}

function toolIsFileEdit(payload: Record<string, unknown>): boolean {
  const toolName = stringValue(payload['tool_name']) ?? stringValue(payload['toolName']);
  return Boolean(toolName && /write|edit|patch|create|delete/i.test(toolName));
}

function eventId(
  provider: AgentProvider,
  nativeType: string,
  sessionId: string,
  payload: Record<string, unknown>,
  properties: Record<string, unknown>
): string {
  const explicit =
    stringValue(payload['event_id']) ??
    stringValue(payload['eventId']) ??
    stringValue(payload['tool_use_id']) ??
    stringValue(payload['toolUseId']) ??
    stringValue(properties['id']);
  if (explicit) return `${provider}:${explicit}`;

  const fingerprint = JSON.stringify({
    provider,
    nativeType,
    sessionId,
    tool: payload['tool_name'] ?? payload['toolName'] ?? properties['tool'],
    input: payload['tool_input'] ?? payload['toolInput'] ?? properties['input'],
    path: payload['file_path'] ?? payload['filePath'] ?? properties['filePath'],
    command: payload['command'] ?? properties['command'],
    source: payload['source'],
  });
  return `${provider}:${createHash('sha256').update(fingerprint).digest('hex').slice(0, 32)}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
