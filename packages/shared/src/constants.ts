export const TOOL_NAMES = {
  SEARCH: 'cortex_search',
  ADD: 'cortex_add',
  LIST: 'cortex_list',
  STATS: 'cortex_stats',
  CONTEXT: 'cortex_context',
  GUARD: 'cortex_guard',
  SCAN: 'cortex_scan',
  AUTO_SAVE: 'cortex_auto_save',
  REMEMBER: 'cortex_remember',
  RECALL: 'cortex_recall',
  WORKFLOW: 'cortex_workflow',
  CONSTITUTION: 'cortex_constitution',
  THINK: 'cortex_think',
  START: 'cortex_start',
  STATUS: 'cortex_status',
  CAPTURE: 'cortex_capture',
  HANDOFF: 'cortex_handoff',
  RESUME: 'cortex_resume',
  VERIFY: 'cortex_verify',
  DETECT: 'cortex_detect',
} as const;

export const MEMORY_TYPES = {
  FACT: 'fact',
  DECISION: 'decision',
  CODE: 'code',
  CONFIG: 'config',
  NOTE: 'note',
} as const;

export const SERVER_CONFIG = {
  NAME: 'cortex-memory',
  VERSION: '0.3.0',
  ALIAS: 'cortex-cloud', // For cloud-layer compatibility
} as const;

export const WORKFLOW_PHASES = {
  EXPLORE: 'EXPLORE',
  PLAN: 'PLAN',
  CODE: 'CODE',
  VERIFY: 'VERIFY',
  COMMIT: 'COMMIT',
} as const;

export const SENSITIVE_DATA_FILTERS = [
  'api_keys',
  'secrets',
  'emails',
  'urls_auth',
  'credit_cards',
  'phone_numbers',
  'ip_addresses',
  'pii',
] as const;
