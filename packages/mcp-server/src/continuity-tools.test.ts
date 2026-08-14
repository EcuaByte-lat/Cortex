import { describe, expect, test } from 'bun:test';
import { createContinuityToolDefinitions } from './continuity-tools';

describe('continuity MCP surface', () => {
  test('defines the provider-neutral lifecycle tool names', () => {
    expect(createContinuityToolDefinitions().map((tool) => tool.name)).toEqual([
      'cortex_start',
      'cortex_status',
      'cortex_capture',
      'cortex_handoff',
      'cortex_resume',
      'cortex_verify',
      'cortex_detect',
    ]);
  });
});
