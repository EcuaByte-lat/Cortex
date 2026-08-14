import { describe, expect, test } from 'bun:test';
import {
  DashboardMemoryState,
  getDirectProviderOrder,
  mayPromptForProvider,
  parseProjectContextResponse,
  shouldShowScanSurfaces,
  shouldUseNativeModels,
} from '../scanRuntime';

const fallback = {
  projectName: 'Cortex',
  purpose: 'Local fallback context',
  techStack: ['TypeScript'],
  architecture: 'Fallback architecture',
  areas: [],
  existingMemories: '',
  language: 'English',
};

describe('Scan runtime policy', () => {
  test('keeps automatic scans silent and leaves surfaces for manual scans', () => {
    expect(shouldShowScanSurfaces('startup')).toBe(false);
    expect(shouldUseNativeModels('startup')).toBe(false);
    expect(mayPromptForProvider('startup')).toBe(false);
    expect(shouldShowScanSurfaces('manual')).toBe(true);
    expect(shouldUseNativeModels('manual')).toBe(true);
    expect(mayPromptForProvider('manual')).toBe(true);
  });

  test('detects direct providers before requiring native Copilot models', () => {
    expect(getDirectProviderOrder('gemini')).toEqual(['gemini']);
    expect(getDirectProviderOrder('auto')).toEqual([
      'anthropic',
      'openai',
      'gemini',
      'mistral',
      'deepseek',
      'ollama',
    ]);
  });
});

describe('Project context parsing', () => {
  test('parses fenced JSON containing nested objects and braces in strings', () => {
    const response = `Here is the result:\n\`\`\`json\n${JSON.stringify({
      projectName: 'Cortex',
      purpose: 'Preserve {verified} engineering state.',
      techStack: ['TypeScript'],
      architecture: 'Monorepo',
      language: 'English',
      areas: [
        {
          name: 'Extension',
          path: 'packages/vscode-extension',
          needsDeepAnalysis: true,
          keyFiles: ['src/extension.ts'],
          reason: 'Contains runtime orchestration',
        },
      ],
    })}\n\`\`\``;

    const context = parseProjectContextResponse(response, fallback);
    expect(context.projectName).toBe('Cortex');
    expect(context.areas).toHaveLength(1);
    expect(context.areas[0]?.keyFiles).toEqual(['src/extension.ts']);
  });

  test('returns deterministic fallback instead of an empty context for invalid output', () => {
    expect(parseProjectContextResponse('not JSON', fallback)).toEqual(fallback);
    expect(parseProjectContextResponse('{"projectName":"Cortex","areas":[]}', fallback)).toEqual(
      fallback
    );
  });
});

describe('Dashboard memory state', () => {
  test('retains saved memories and ignores duplicate event delivery', () => {
    const state = new DashboardMemoryState<{ id: number; content: string }>();
    const memories = Array.from({ length: 135 }, (_, index) => ({
      id: index + 1,
      content: `Memory ${index + 1}`,
    }));

    state.hydrate(memories);
    const firstMemory = memories[0];
    if (!firstMemory) throw new Error('Expected a seeded memory');
    expect(state.add(firstMemory)).toBe(false);
    expect(state.getAll()).toHaveLength(135);
  });
});
