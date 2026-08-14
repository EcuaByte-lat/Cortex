export type ScanRunMode = 'startup' | 'manual';

export interface ScanArea {
  name: string;
  path: string;
  needsDeepAnalysis: boolean;
  keyFiles: string[];
  reason: string;
}

export interface ScanProjectContext {
  projectName: string;
  purpose: string;
  techStack: string[];
  architecture: string;
  areas: ScanArea[];
  existingMemories: string;
  language: string;
}

export interface DashboardMemory {
  id?: number | string;
  content: string;
  [key: string]: unknown;
}

export function shouldShowScanSurfaces(mode: ScanRunMode): boolean {
  return mode === 'manual';
}

export function shouldUseNativeModels(mode: ScanRunMode): boolean {
  return mode === 'manual';
}

export function mayPromptForProvider(mode: ScanRunMode): boolean {
  return mode === 'manual';
}

export function getDirectProviderOrder(configuredProvider: string): string[] {
  if (configuredProvider !== 'auto') return [configuredProvider];
  return ['anthropic', 'openai', 'gemini', 'mistral', 'deepseek', 'ollama'];
}

function findBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index++) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

export function extractJsonObject(text: string): string | null {
  const normalized = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  return findBalancedJsonObject(normalized);
}

function isValidArea(value: unknown): value is ScanArea {
  if (!value || typeof value !== 'object') return false;
  const area = value as Partial<ScanArea>;
  return (
    typeof area.name === 'string' &&
    area.name.trim().length > 0 &&
    typeof area.path === 'string' &&
    typeof area.needsDeepAnalysis === 'boolean' &&
    Array.isArray(area.keyFiles) &&
    area.keyFiles.every((file) => typeof file === 'string') &&
    typeof area.reason === 'string'
  );
}

export function parseProjectContextResponse(
  response: string,
  fallback: ScanProjectContext
): ScanProjectContext {
  const json = extractJsonObject(response);
  if (!json) return fallback;

  try {
    const parsed = JSON.parse(json) as Partial<ScanProjectContext>;
    if (
      typeof parsed.projectName !== 'string' ||
      parsed.projectName.trim().length === 0 ||
      typeof parsed.purpose !== 'string' ||
      parsed.purpose.trim().length === 0 ||
      !Array.isArray(parsed.techStack) ||
      !parsed.techStack.every((item) => typeof item === 'string') ||
      typeof parsed.architecture !== 'string' ||
      !Array.isArray(parsed.areas) ||
      !parsed.areas.every(isValidArea) ||
      typeof parsed.language !== 'string' ||
      parsed.language.trim().length === 0
    ) {
      return fallback;
    }

    return {
      projectName: parsed.projectName,
      purpose: parsed.purpose,
      techStack: parsed.techStack,
      architecture: parsed.architecture,
      areas: parsed.areas,
      existingMemories: fallback.existingMemories,
      language: parsed.language,
    };
  } catch {
    return fallback;
  }
}

export class DashboardMemoryState<T extends DashboardMemory> {
  private memories: T[] = [];

  clear() {
    this.memories = [];
  }

  hydrate(memories: T[]) {
    this.clear();
    for (const memory of memories) this.add(memory);
  }

  add(memory: T): boolean {
    const key = memory.id ?? memory.content;
    if (this.memories.some((item) => (item.id ?? item.content) === key)) return false;
    this.memories.push(memory);
    return true;
  }

  getAll(): T[] {
    return [...this.memories];
  }
}
