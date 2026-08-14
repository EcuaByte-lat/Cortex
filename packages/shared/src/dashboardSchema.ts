import { z } from 'zod';

const actorSchema = z
  .object({
    harness: z.string().min(1),
    model: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    sessionId: z.string().min(1).optional(),
  })
  .strict();

const repositorySchema = z
  .object({
    root: z.string(),
    remote: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
    commit: z.string().min(1).optional(),
    worktree: z.string().min(1).optional(),
  })
  .strict();

const evidenceSummarySchema = z
  .object({
    current: z.number().int().nonnegative(),
    verified: z.number().int().nonnegative(),
    unverified: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
    conflicts: z.number().int().nonnegative(),
  })
  .strict();

const eventKindSchema = z.enum([
  'session',
  'prompt',
  'tool',
  'file',
  'command',
  'checkpoint',
  'error',
  'evidence',
]);

const dashboardEventSchema = z
  .object({
    id: z.string().min(1),
    kind: eventKindSchema,
    type: z.string().min(1),
    summary: z.string().min(1),
    status: z.string().min(1),
    authority: z.string().min(1).optional(),
    source: z.string().min(1).optional(),
    timestamp: z.string().min(1),
    taskId: z.string().min(1).optional(),
    attemptId: z.string().min(1).optional(),
    agent: actorSchema,
    repository: repositorySchema,
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const dashboardTaskSchema = z
  .object({
    id: z.string().min(1),
    objective: z.string().min(1),
    acceptanceCriteria: z.array(z.string()),
    status: z.enum(['working', 'waiting', 'blocked', 'completed', 'abandoned']),
    actor: actorSchema.optional(),
    attemptId: z.string().min(1).optional(),
    repository: repositorySchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    latestEvent: dashboardEventSchema.optional(),
    evidence: evidenceSummarySchema,
  })
  .strict();

const continuityTaskSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    objective: z.string().min(1),
    acceptanceCriteria: z.array(z.string()),
    status: z.enum(['in_progress', 'blocked', 'completed', 'abandoned']),
    repository: repositorySchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();

const continuityAttemptSchema = z
  .object({
    id: z.string().min(1),
    taskId: z.string().min(1),
    actor: actorSchema,
    status: z.enum(['active', 'ended']),
    startedAt: z.string().min(1),
    endedAt: z.string().min(1).optional(),
  })
  .strict();

const continuityEvidenceSchema = z
  .object({
    id: z.string().min(1),
    taskId: z.string().min(1),
    attemptId: z.string().min(1),
    kind: z.enum([
      'observation',
      'decision',
      'command',
      'file_change',
      'test',
      'blocker',
      'artifact',
      'verification',
    ]),
    summary: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    source: z.enum(['git', 'ci', 'tool', 'file', 'human', 'agent', 'external']),
    authority: z.enum(['observed', 'verified', 'approved', 'inferred', 'unknown']),
    status: z.enum(['current', 'stale', 'superseded', 'failed', 'unverified']),
    observedAt: z.string().min(1),
    recordedAt: z.string().min(1),
  })
  .strict();

const continuityHandoffSchema = z
  .object({
    id: z.string().min(1),
    schemaVersion: z.string().min(1),
    task: continuityTaskSchema,
    attempt: continuityAttemptSchema,
    summary: z.string().min(1),
    decisions: z.array(continuityEvidenceSchema),
    filesChanged: z.array(continuityEvidenceSchema),
    commands: z.array(continuityEvidenceSchema),
    tests: z.array(continuityEvidenceSchema),
    blockers: z.array(continuityEvidenceSchema),
    artifacts: z.array(continuityEvidenceSchema),
    evidence: z.array(continuityEvidenceSchema),
    nextActions: z.array(z.string()),
    freshness: z.enum(['current', 'stale', 'unknown']),
    createdAt: z.string().min(1),
  })
  .strict();

export const dashboardSnapshotSchema = z
  .object({
    workspace: z.object({ name: z.string(), root: z.string() }).strict(),
    connection: z.enum(['live', 'stale', 'offline']),
    lastSeenAt: z.string().min(1).optional(),
    activeTaskId: z.string().min(1).optional(),
    tasks: z.array(dashboardTaskSchema),
    events: z.array(dashboardEventSchema),
    evidenceSummary: evidenceSummarySchema,
    latestHandoff: continuityHandoffSchema.optional(),
    generatedAt: z.string().min(1),
  })
  .strict();

const taskCommandDataSchema = z.object({ taskId: z.string().min(1) }).strict();

export const dashboardCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }).strict(),
  z.object({ type: z.literal('refreshDashboard') }).strict(),
  z.object({
    type: z.literal('copyEvidence'),
    data: z
      .object({ summary: z.string().min(1), details: z.record(z.string(), z.unknown()).optional() })
      .strict(),
  }),
  ...(['copyHandoff', 'openHandoff', 'resumeTask'] as const).map((type) =>
    z.object({ type: z.literal(type), data: taskCommandDataSchema }).strict()
  ),
]);

export const dashboardMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('continuitySnapshot'),
    snapshot: dashboardSnapshotSchema,
  }),
  z.object({
    type: z.literal('hydrate'),
    state: z.object({ continuity: dashboardSnapshotSchema.nullable().optional() }).passthrough(),
  }),
  z.object({ type: z.literal('clearState') }).strict(),
  z.object({
    type: z.literal('systemStatus'),
    mcp: z.enum(['ready', 'error']),
    db: z.enum(['ready', 'error']),
  }),
]);

export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
export type DashboardCommand = z.infer<typeof dashboardCommandSchema>;
export type DashboardMessage = z.infer<typeof dashboardMessageSchema>;
