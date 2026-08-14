/**
 * @ecuabyte/cortex-core - Core storage and context primitives for Cortex
 *
 * Provides the 5 context primitives:
 * - ctx/store + ctx/get: MemoryStore ✅
 * - ctx/route: ContextRouter ✅
 * - ctx/guard: ContextGuard ✅
 * - ctx/fuse: ContextFuser ✅
 * - ctx/embed: Embeddings ✅
 */

// Re-export types from shared
export type {
  ActorIdentity,
  AgentBridgeResult,
  AgentEvent,
  AgentEventType,
  Brand,
  // Fuse types
  ContextSource,
  ContinuityAttempt,
  ContinuityEvidence,
  ContinuityHandoff,
  ContinuityStatus,
  ContinuityTask,
  EmbeddingProviderConfig,
  Entity,
  EvidenceAuthority,
  EvidenceKind,
  EvidenceSource,
  EvidenceStatus,
  FuseOptions,
  FuseResult,
  // Guard types
  GuardFilterType,
  GuardMode,
  GuardOptions,
  GuardResult,
  IContextFuser,
  IContextGuard,
  IContextRouter,
  IEmbeddingProvider,
  IMemoryStore,
  Memory,
  MemoryStoreOptions,
  MemoryType,
  MemoryWithEmbedding,
  Repository,
  RepositoryContext,
  // Generic Patterns
  Result,
  // Context routing types
  RouteOptions,
  ScoredMemory,
  SemanticSearchOptions,
  SemanticSearchResult,
  Service,
  ToolResponse,
} from '@ecuabyte/cortex-shared';
export { AgentBridge, type AgentBridgeOptions } from './agent-bridge';
// Project context utilities
export { clearProjectCache, getProjectId, getProjectName } from './context';
// Engineering continuity and handoff state
export {
  type CaptureEvidenceInput,
  ContinuityStore,
  type ContinuityStoreOptions,
  type CreateHandoffInput,
  type DetectInput,
  type DetectResult,
  type ResumeInput,
  type ResumeResult,
  type StartTaskInput,
  type VerifyInput,
} from './continuity';
export { renderContinuityHandoffMarkdown } from './continuity-markdown';
// ctx/embed
export {
  cosineSimilarity,
  createEmbeddingProvider,
  DEFAULT_EMBEDDING_MODEL,
  deserializeEmbedding,
  OllamaEmbeddings,
  OpenAIEmbeddings,
  serializeEmbedding,
} from './embeddings';
// ctx/fuse
export { ContextFuser } from './fuser';
// ctx/guard
export { ContextGuard } from './guard';
// ctx/route
export { ContextRouter } from './router';
// ctx/scan - Project scanning utilities
export { ProjectScanner, type ScanOptions, type ScanResult } from './scanner';
// ctx/store + ctx/get
export {
  isValidMemoryType,
  MEMORY_TYPES,
  MemoryStore,
  validateMemoryType,
} from './storage';
