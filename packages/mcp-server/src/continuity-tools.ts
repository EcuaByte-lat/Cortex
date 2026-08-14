import { TOOL_NAMES } from '@ecuabyte/cortex-shared';

export interface ContinuityToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const repositorySchema = {
  type: 'object',
  properties: {
    root: { type: 'string', description: 'Absolute repository/worktree root' },
    remote: { type: 'string', description: 'Normalized Git remote URL' },
    branch: { type: 'string' },
    commit: { type: 'string' },
    worktree: { type: 'string' },
  },
  required: ['root'],
};

const actorSchema = {
  type: 'object',
  properties: {
    harness: { type: 'string', description: 'Agent harness, for example codex or opencode' },
    model: { type: 'string' },
    version: { type: 'string' },
    sessionId: { type: 'string' },
  },
  required: ['harness'],
};

export function createContinuityToolDefinitions(): ContinuityToolDefinition[] {
  return [
    {
      name: TOOL_NAMES.START,
      description:
        'Start or attach an agent attempt to an engineering task. Returns explicit taskId and attemptId handles that survive agent changes.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          objective: { type: 'string' },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          repository: repositorySchema,
          actor: actorSchema,
          taskId: { type: 'string' },
          attemptId: { type: 'string' },
        },
        required: ['projectId', 'objective', 'repository', 'actor'],
      },
    },
    {
      name: TOOL_NAMES.STATUS,
      description:
        'Get the current task and latest attempt without returning the full evidence trail.',
      inputSchema: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
      },
    },
    {
      name: TOOL_NAMES.CAPTURE,
      description:
        'Append high-signal engineering evidence. Agent summaries are not verification; provide source and authority explicitly.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          attemptId: { type: 'string' },
          kind: {
            type: 'string',
            enum: [
              'observation',
              'decision',
              'command',
              'file_change',
              'test',
              'blocker',
              'artifact',
              'verification',
            ],
          },
          summary: { type: 'string' },
          details: { type: 'object' },
          source: {
            type: 'string',
            enum: ['git', 'ci', 'tool', 'file', 'human', 'agent', 'external'],
          },
          authority: {
            type: 'string',
            enum: ['observed', 'verified', 'approved', 'inferred', 'unknown'],
          },
          status: {
            type: 'string',
            enum: ['current', 'stale', 'superseded', 'failed', 'unverified'],
          },
          observedAt: { type: 'string' },
        },
        required: ['taskId', 'attemptId', 'kind', 'summary', 'source'],
      },
    },
    {
      name: TOOL_NAMES.HANDOFF,
      description:
        'Create a bounded Markdown/JSON-ready handoff projection for another human or agent.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          attemptId: { type: 'string' },
          summary: { type: 'string' },
          nextActions: { type: 'array', items: { type: 'string' } },
        },
        required: ['taskId', 'attemptId'],
      },
    },
    {
      name: TOOL_NAMES.RESUME,
      description:
        'Resume a task using the latest handoff and evidence. Always verify the current repository before trusting stale assumptions.',
      inputSchema: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
      },
    },
    {
      name: TOOL_NAMES.VERIFY,
      description: 'Record evidence that confirms, rejects, or qualifies a claim.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          attemptId: { type: 'string' },
          summary: { type: 'string' },
          source: {
            type: 'string',
            enum: ['git', 'ci', 'tool', 'file', 'human', 'agent', 'external'],
          },
          details: { type: 'object' },
          status: {
            type: 'string',
            enum: ['current', 'stale', 'superseded', 'failed', 'unverified'],
          },
        },
        required: ['taskId', 'attemptId', 'summary', 'source'],
      },
    },
    {
      name: TOOL_NAMES.DETECT,
      description:
        'Compare the current repository against the task checkpoint and report drift explicitly.',
      inputSchema: {
        type: 'object',
        properties: { taskId: { type: 'string' }, repository: repositorySchema },
        required: ['taskId', 'repository'],
      },
    },
  ];
}
