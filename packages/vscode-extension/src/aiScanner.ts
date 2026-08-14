/**
 * Cortex AI Scanner - Hierarchical Contextual Analysis
 *
 * Three-Phase Intelligent Analysis:
 * Phase 1: Global Context (read anchor files, understand project holistically)
 * Phase 2: Directed Analysis (AI decides what needs deeper inspection)
 * Phase 3: Synthesis (consolidate and deduplicate memories)
 *
 * Features:
 * - Context-aware analysis (no blind file selection)
 * - AI-driven depth decisions
 * - Rich, detailed memories (no length limits)
 * - Streaming output with visual feedback
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import type { Memory, MemoryType } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import type { AIScanWebview } from './aiScanWebview';
import { AIProvider, CortexConfig } from './config';
import {
  type CliProviderId,
  discoverCliProviders,
  getProviderCandidatesForSelection,
} from './providerDiscovery';
// import { AIScanResult, AIMemory, ProjectContext, ProjectArea } from './types';
import {
  AnthropicModelAdapter,
  type AnthropicModelId,
  CliModelAdapter,
  DeepSeekModelAdapter,
  FallbackModelAdapter,
  GeminiModelAdapter,
  type GeminiModelId,
  MistralModelAdapter,
  type ModelAdapter,
  OllamaModelAdapter,
  OpenAIModelAdapter,
  type OpenAIModelId,
} from './providers';
import {
  getDirectProviderOrder,
  mayPromptForProvider,
  parseProjectContextResponse,
  type ScanRunMode,
  shouldShowScanSurfaces,
  shouldUseNativeModels,
} from './scanRuntime';
import type { MemoryStore } from './storage';

export interface AIMemory {
  id?: number | string;
  content: string;
  type: MemoryType;
  source: string;
  tags: string[];
  [key: string]: unknown;
}

export interface AIScanResult {
  memories: AIMemory[];
  filesAnalyzed: number;
  modelUsed: string;
  savedCount: number; // Number of memories saved in real-time
}

// Callback for real-time memory saving
export type OnMemorySaved = (memory: AIMemory, savedCount: number) => void;

interface ProjectContext {
  projectName: string;
  purpose: string;
  techStack: string[];
  architecture: string;
  areas: ProjectArea[];
  existingMemories: string;
  language: string; // Detected language for output (e.g., "English", "Spanish", "Portuguese")
}

export class NoProviderAvailableError extends Error {
  constructor() {
    super('No configured AI provider is available');
    this.name = 'NoProviderAvailableError';
  }
}

interface ModelSelectionOptions {
  interactive: boolean;
  accessInformation?: vscode.LanguageModelAccessInformation;
}

export interface ProjectArea {
  name: string;
  path: string;
  needsDeepAnalysis: boolean;
  keyFiles: string[];
  reason: string;
  // UI State Properties
  rationale?: string; // mapping to reason for API compatibility if needed
  status?: 'pending' | 'analyzing' | 'complete' | 'skipped' | 'error';
  memoryCount?: number;
}

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  '.cache',
  'out',
  'target',
  'bin',
  'obj',
  '.nuxt',
  '.output',
  '.turbo',
  '.vercel',
];

// Anchor files - always read first for global understanding
const ANCHOR_FILES = [
  'README.md',
  'readme.md',
  'README',
  'package.json',
  'composer.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'ARCHITECTURE.md',
  'DESIGN.md',
  'CONTRIBUTING.md',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  '.env.example',
  '.env.sample',
  'tsconfig.json',
  'webpack.config.js',
  'vite.config.ts',
  'Makefile',
  'justfile',
];

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Cortex AI Scan');
  }
  return outputChannel;
}

/**
 * Generate comprehensive tree structure
 */
function generateTreeStructure(rootPath: string): string {
  try {
    const ignorePattern = SKIP_DIRS.join('|');
    const treeCmd = `tree -L 6 --noreport -I "${ignorePattern}" --dirsfirst 2>/dev/null || find . -maxdepth 6 -type f ! -path './node_modules/*' ! -path './.git/*' 2>/dev/null | head -300`;

    const result = execSync(treeCmd, {
      cwd: rootPath,
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024,
    });

    return result.slice(0, 30000);
  } catch {
    return generateManualTree(rootPath, '', 0, 6);
  }
}

function generateManualTree(
  rootPath: string,
  prefix: string,
  depth: number,
  maxDepth: number
): string {
  if (depth >= maxDepth) return '';

  let result = '';
  try {
    const entries = readdirSync(rootPath, { withFileTypes: true })
      .filter((e) => !SKIP_DIRS.includes(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    for (let i = 0; i < entries.length && i < 50; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1 || i === 49;
      const connector = isLast ? '└── ' : '├── ';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      if (entry.isDirectory()) {
        result += `${prefix}${connector}${entry.name}/\n`;
        result += generateManualTree(join(rootPath, entry.name), newPrefix, depth + 1, maxDepth);
      } else {
        result += `${prefix}${connector}${entry.name}\n`;
      }
    }
  } catch {
    /* skip */
  }

  return result;
}

/**
 * Read a file safely with generous size limit
 */
function readFileSafe(filePath: string, maxSize: number = 500000): string | null {
  try {
    if (!existsSync(filePath)) return null;
    const stat = statSync(filePath);
    if (!stat.isFile() || stat.size > maxSize) return null;
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Read all anchor files from project root
 */
function readAnchorFiles(rootPath: string): { name: string; content: string }[] {
  const anchors: { name: string; content: string }[] = [];

  for (const anchorName of ANCHOR_FILES) {
    const filePath = join(rootPath, anchorName);
    const content = readFileSafe(filePath);
    if (content) {
      anchors.push({ name: anchorName, content });
    }
  }

  return anchors;
}

/**
 * Format existing memories for deduplication
 */
function formatExistingMemories(memories: Memory[]): string {
  if (memories.length === 0) return '';
  const items = memories.map((m) => `- [${m.type}] ${m.content}`);
  return `## MEMORIAS EXISTENTES (NO REPETIR):\n${items.join('\n')}\n\n`;
}

/**
 * Select the best available model using hybrid provider logic
 * 1. Try native vscode.lm first (Copilot, Gemini Code Assist, etc.)
 * 2. Check for any stored API keys (Gemini, OpenAI, Anthropic)
 * 3. Prompt user to choose provider and enter API key
 */
async function createDirectAdapter(
  provider: AIProvider,
  secrets?: vscode.SecretStorage
): Promise<ModelAdapter | null> {
  if (!secrets) return null;
  try {
    switch (provider) {
      case AIProvider.Gemini:
        return GeminiModelAdapter.fromSecrets(secrets);
      case AIProvider.OpenAI:
        return OpenAIModelAdapter.fromSecrets(secrets);
      case AIProvider.Anthropic:
        return AnthropicModelAdapter.fromSecrets(secrets);
      case AIProvider.Mistral:
        return MistralModelAdapter.fromSecrets(secrets);
      case AIProvider.DeepSeek:
        return DeepSeekModelAdapter.fromSecrets(secrets);
      case AIProvider.Ollama:
        return OllamaModelAdapter.fromSecrets(secrets);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function resolveCliExecutable(command: string): string | undefined {
  const resolver = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    return execFileSync(resolver, [command], {
      encoding: 'utf8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
  } catch {
    return undefined;
  }
}

function toCliProviderId(provider: AIProvider | 'auto'): CliProviderId | 'auto' | undefined {
  switch (provider) {
    case AIProvider.Codex:
      return 'codex';
    case AIProvider.Claude:
      return 'claude';
    case AIProvider.Gemini:
      return 'gemini';
    case AIProvider.Copilot:
      return 'copilot';
    case AIProvider.Auto:
      return 'auto';
    default:
      return undefined;
  }
}

async function createCliAdapter(
  provider: AIProvider | 'auto',
  workspacePath: string,
  channel: vscode.OutputChannel
): Promise<ModelAdapter | null> {
  const candidates = discoverCliProviders({
    env: process.env,
    homeDir: homedir(),
    resolveCommand: resolveCliExecutable,
    fileExists: existsSync,
  });
  const requested = toCliProviderId(provider);
  if (requested === undefined) return null;

  const selectable = getProviderCandidatesForSelection(candidates, requested);
  const adapters = selectable.map((candidate) => {
    channel.appendLine(
      `CLI detectado: ${candidate.id} (${candidate.authSources.join(', ') || 'configuración local'})`
    );
    return new CliModelAdapter(candidate, workspacePath);
  });

  return adapters.length === 0
    ? null
    : adapters.length === 1
      ? adapters[0]
      : new FallbackModelAdapter(adapters);
}

async function selectBestModel(
  channel: vscode.OutputChannel,
  secrets?: vscode.SecretStorage,
  workspacePath?: string,
  options: ModelSelectionOptions = { interactive: true }
): Promise<{ adapter: ModelAdapter; nativeModel?: vscode.LanguageModelChat }> {
  // Helper to detect current editor
  const detectEditor = (): 'Cursor' | 'Windsurf' | 'Antigravity' | 'VS Code' => {
    const appName = vscode.env.appName || '';
    if (appName.includes('Cursor')) return 'Cursor';
    if (appName.includes('Windsurf')) return 'Windsurf';
    if (appName.includes('Antigravity') || appName.includes('Google')) return 'Antigravity';
    return 'VS Code';
  };

  const editor = detectEditor();
  channel.appendLine(`🖥️ Editor detectado: ${editor}`);

  const configuredProvider = CortexConfig.provider;
  const cliWorkspace =
    workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

  // Prefer configured BYOK/local providers. They do not require Copilot consent.
  if (configuredProvider !== AIProvider.Auto) {
    const directAdapter = await createDirectAdapter(configuredProvider, secrets);
    if (directAdapter) {
      channel.appendLine(`âœ“ Usando ${directAdapter.name}`);
      return { adapter: directAdapter };
    }
    const cliAdapter = await createCliAdapter(configuredProvider, cliWorkspace, channel);
    if (cliAdapter) {
      channel.appendLine(`CLI seleccionado: ${cliAdapter.name}`);
      return { adapter: cliAdapter };
    }
    if (!options.interactive) throw new NoProviderAvailableError();
  } else {
    for (const provider of getDirectProviderOrder('auto')) {
      const directAdapter = await createDirectAdapter(provider as AIProvider, secrets);
      if (directAdapter) {
        channel.appendLine(`âœ“ Auto-detectado: ${directAdapter.name}`);
        return { adapter: directAdapter };
      }
    }
    const cliAdapter = await createCliAdapter(AIProvider.Auto, cliWorkspace, channel);
    if (cliAdapter) {
      channel.appendLine(`CLI auto-detectado: ${cliAdapter.name}`);
      return { adapter: cliAdapter };
    }
  }

  if (!mayPromptForProvider(options.interactive ? 'manual' : 'startup')) {
    throw new NoProviderAvailableError();
  }

  // Native models (including Copilot) are only queried from a user action.
  if (
    shouldUseNativeModels(options.interactive ? 'manual' : 'startup') &&
    vscode.lm?.selectChatModels
  ) {
    const allModels = await vscode.lm.selectChatModels({});
    const access = options.accessInformation;
    const accessibleModels = access
      ? allModels.filter((model) => access.canSendRequest(model) !== false)
      : allModels;

    if (accessibleModels.length > 0) {
      channel.appendLine(`📋 Modelos nativos disponibles en ${editor} (${allModels.length}):`);
      for (const m of accessibleModels.slice(0, 10)) {
        channel.appendLine(`   - ${m.name || m.id}`);
      }

      // Priority: most powerful models first (available in 2026)
      const priorityNames = [
        // Tier 1: Premium Flagships (2026)
        'claude-4.5-opus',
        'gpt-5',
        'gpt-5-turbo',
        'gemini-2.5-ultra',
        'deepseek-v4',
        'mistral-large-3',
        // Antigravity Native Models
        'gemini-3-pro',
        'gemini-ultra',
        'o3-high',
        'o3-pro',
        // Tier 2: Strong Reasoning
        'claude-4.5-sonnet',
        'claude-3-7-sonnet',
        'gpt-4o',
        'gemini-2.5-pro',
        'deepseek-v3.2',
        // Tier 3: Fast / Cost Effective
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gpt-4o-mini',
        'claude-3-5-haiku',
        // Tier 4: Specialized / Other
        'copilot',
        'codestral',
        'deepseek',
      ];

      for (const priority of priorityNames) {
        const match = accessibleModels.find(
          (m) =>
            m.name?.toLowerCase().includes(priority) ||
            m.id?.toLowerCase().includes(priority.replace(/\s+/g, '-'))
        );
        if (match) {
          channel.appendLine(`\n✓ Seleccionado (nativo): ${match.name || match.id}`);
          const { VSCodeModelAdapter } = await import('./providers');
          return {
            adapter: new VSCodeModelAdapter(match),
            nativeModel: match,
          };
        }
      }

      // Use first available model
      const fallback = accessibleModels[0];
      channel.appendLine(`\n⚠️ Fallback (nativo): ${fallback.name || fallback.id}`);
      const { VSCodeModelAdapter } = await import('./providers');
      return {
        adapter: new VSCodeModelAdapter(fallback),
        nativeModel: fallback,
      };
    }
  } else if (editor === 'Cursor') {
    channel.appendLine(
      `⚠️ Cursor detectado: La API nativa (vscode.lm) no está soportada oficialmente.`
    );
    channel.appendLine(
      `   Se requiere configurar una API Key manual para Gemini/OpenAI/Anthropic.`
    );
  }

  if (configuredProvider !== AIProvider.Auto) {
    channel.appendLine(`\n⚙️ Proveedor configurado: ${configuredProvider}`);

    let adapter: ModelAdapter | null = null;

    if (secrets) {
      switch (configuredProvider) {
        case AIProvider.Gemini:
          adapter = await GeminiModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.OpenAI:
          adapter = await OpenAIModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.Anthropic:
          adapter = await AnthropicModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.Mistral:
          adapter = await MistralModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.DeepSeek:
          adapter = await DeepSeekModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.Ollama:
          adapter = await OllamaModelAdapter.fromSecrets(secrets);
          break;
      }
    }

    if (adapter) {
      channel.appendLine(`✓ Usando ${adapter.name}`);
      return { adapter };
    } else {
      channel.appendLine(`⚠️ Error: No se pudo configurar ${configuredProvider}. Revise API Key.`);
    }
  }

  // 3. Fallback: Check for any stored keys (Auto Mode logic)
  channel.appendLine('\n🔑 Buscando credenciales disponibles...');

  // Try Configured Priority Order
  const autoOrder = CortexConfig.autoProviderOrder; // Claude > OpenAI > Gemini etc

  for (const provider of autoOrder) {
    let adapter: ModelAdapter | null = null;
    if (secrets) {
      switch (provider) {
        case AIProvider.Anthropic:
          adapter = await AnthropicModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.OpenAI:
          adapter = await OpenAIModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.Gemini:
          adapter = await GeminiModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.DeepSeek:
          adapter = await DeepSeekModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.Mistral:
          adapter = await MistralModelAdapter.fromSecrets(secrets);
          break;
        case AIProvider.Ollama:
          adapter = await OllamaModelAdapter.fromSecrets(secrets);
          break;
      }
    }

    if (adapter) {
      channel.appendLine(`✓ Auto-detectado: ${adapter.name}`);
      return { adapter };
    }
  }

  // 4. Prompt User
  channel.appendLine('❓ No se encontraron credenciales válidas. Solicitando al usuario...');

  const selected = await vscode.window.showQuickPick(
    [
      {
        label: '$(sparkle) Google Gemini',
        description: 'FREE (Recommended)',
        detail: 'gemini-3-pro / 2.5-ultra - Free Tier',
        value: AIProvider.Gemini,
      },
      { label: '$(beaker) OpenAI', description: 'GPT-5 / o3-pro', value: AIProvider.OpenAI },
      {
        label: '$(robot) Anthropic',
        description: 'Claude 4.5 Opus / 3.7',
        value: AIProvider.Anthropic,
      },
      {
        label: '$(sparkle) Mistral',
        description: 'Mistral / Codestral',
        value: AIProvider.Mistral,
      },
      { label: '$(zap) DeepSeek', description: 'DeepSeek V3 / Coder', value: AIProvider.DeepSeek },
      { label: '$(server) Ollama', description: 'Local Models', value: AIProvider.Ollama },
      {
        label: '$(clippy) Copy Prompt to Clipboard',
        description: 'Use your own AI',
        detail: `Paste in ${editor}, or any AI chat`,
        // biome-ignore lint/suspicious/noExplicitAny: Clipboard type not fully exposed
        value: 'clipboard' as any,
      },
    ],
    { title: 'Select AI Provider', placeHolder: 'Choose a provider to analyze this project' }
  );

  if (!selected) throw new Error('No AI provider selected');

  // Handle clipboard fallback option
  if ((selected.value as string) === 'clipboard') {
    throw new Error('CLIPBOARD_FALLBACK');
  }

  // Helper to define 2026 models per provider
  const getModelsForProvider = (p: AIProvider) => {
    switch (p) {
      case AIProvider.Gemini:
        return [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-2.5-ultra',
          'gemini-3-pro-preview',
          'gemini-3-flash-preview',
          'gemini-2.0-flash-thinking-exp-1219',
        ];
      case AIProvider.OpenAI:
        return ['gpt-5', 'gpt-5-turbo', 'gpt-5.2-codex', 'o3-high', 'o3-pro', 'gpt-4o'];
      case AIProvider.Anthropic:
        return ['claude-4.5-opus', 'claude-4.5-sonnet', 'claude-3-7-sonnet', 'claude-3-5-haiku'];
      case AIProvider.Mistral:
        return ['mistral-large-3', 'codestral-25.08', 'ministral-3'];
      case AIProvider.DeepSeek:
        return ['deepseek-v4', 'deepseek-v3.2', 'deepseek-coder-v4'];
      case AIProvider.Ollama:
        return ['deepseek-coder:latest', 'llama3', 'phi3', 'mistral'];
      default:
        return [];
    }
  };

  // Helper to open API key URL
  const openApiKeyUrl = async (provider: AIProvider) => {
    let url = '';
    switch (provider) {
      case AIProvider.Gemini:
        url = 'https://aistudio.google.com/app/apikey';
        break;
      case AIProvider.OpenAI:
        url = 'https://platform.openai.com/api-keys';
        break;
      case AIProvider.Anthropic:
        url = 'https://console.anthropic.com/settings/keys';
        break;
      case AIProvider.Mistral:
        url = 'https://console.mistral.ai/api-keys';
        break;
      case AIProvider.DeepSeek:
        url = 'https://platform.deepseek.com/api_keys';
        break;
    }
    if (url) {
      await vscode.env.openExternal(vscode.Uri.parse(url));
      channel.appendLine(`🌐 Abriendo navegador para obtener API Key: ${url}`);
    }
  };

  // Trigger setup flow for selected provider
  if (secrets) {
    const provider = selected.value as AIProvider;
    let key: string | undefined;

    // 1. Ask for API Key (if needed)
    if (provider === AIProvider.Ollama) {
      key = 'skipped'; // Ollama normally doesn't need a key
    } else {
      // Open URL first
      await openApiKeyUrl(provider);

      if (provider === AIProvider.Gemini) {
        key = await GeminiModelAdapter.promptForApiKey(secrets);
      } else if (provider === AIProvider.OpenAI) {
        key = await OpenAIModelAdapter.promptForApiKey(secrets);
      } else if (provider === AIProvider.Anthropic) {
        key = await AnthropicModelAdapter.promptForApiKey(secrets);
      }
    }

    if (key) {
      // 2. Ask for Modelpreference
      const modelOptions = getModelsForProvider(provider);
      const selectedModel = await vscode.window.showQuickPick(modelOptions, {
        title: `Select Model for ${provider}`,
        placeHolder: 'Select the specific model version to use',
      });

      // 3. Save Configuration Globaly (so we don't ask again)
      try {
        const config = vscode.workspace.getConfiguration('cortex');
        await config.update('provider', provider, vscode.ConfigurationTarget.Global);
        if (selectedModel) {
          await config.update(
            `${provider}.model`,
            selectedModel,
            vscode.ConfigurationTarget.Global
          );
          console.log(`Saved preference: ${provider} -> ${selectedModel}`);
        }
        channel.appendLine(
          `✅ Configuración guardada: ${provider} / ${selectedModel || 'default'}`
        );
      } catch (e) {
        console.error('Failed to save settings', e);
      }

      // 4. Return Adapter
      if (provider === AIProvider.Gemini) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        return {
          adapter: new GeminiModelAdapter(
            new GoogleGenerativeAI(key),
            selectedModel as GeminiModelId
          ),
        };
      } else if (provider === AIProvider.OpenAI) {
        return { adapter: new OpenAIModelAdapter(key, selectedModel as OpenAIModelId) };
      } else if (provider === AIProvider.Anthropic) {
        return { adapter: new AnthropicModelAdapter(key, selectedModel as AnthropicModelId) };
      } else if (provider === AIProvider.Ollama) {
        return { adapter: new OllamaModelAdapter(selectedModel || 'deepseek-coder:latest') };
      }
    }
  } else {
    throw new Error('Secret storage not available');
  }

  throw new Error('AI Provider setup cancelled.');
}

// ============================================================================
// PHASE 1: Build Project Context
// ============================================================================

function createFallbackProjectContext(
  rootPath: string,
  anchors: Array<{ name: string; content: string }>,
  existingMemories: string
): ProjectContext {
  const areas: ProjectArea[] = [];

  try {
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP_DIRS.includes(entry.name)) continue;
      const areaPath = entry.isDirectory() ? `${entry.name}/` : entry.name;
      areas.push({
        name: entry.name,
        path: areaPath,
        needsDeepAnalysis: entry.isDirectory(),
        keyFiles: entry.isDirectory() ? [] : [entry.name],
        reason: 'Fallback context generated without a valid AI response',
      });
      if (areas.length >= 12) break;
    }
  } catch {
    // Keep an empty but valid area list when the workspace cannot be read.
  }

  const anchorText = anchors.find((anchor) => /readme/i.test(anchor.name))?.content || '';
  const purpose = anchorText.match(/^(?:#|##)\s+(.+)$/m)?.[1]?.trim();

  return {
    projectName: basename(rootPath),
    purpose: purpose || 'Local software project',
    techStack: [],
    architecture: 'Architecture could not be inferred automatically; inspect the listed areas.',
    areas,
    existingMemories,
    language: 'English',
  };
}

async function buildProjectContext(
  model: ModelAdapter,
  rootPath: string,
  treeStructure: string,
  existingMemories: string,
  channel: vscode.OutputChannel,
  _webview: AIScanWebview | undefined,
  token: vscode.CancellationToken
): Promise<ProjectContext> {
  const anchors = readAnchorFiles(rootPath);

  channel.appendLine(`📌 Archivos ancla encontrados: ${anchors.length}`);
  for (const a of anchors) {
    channel.appendLine(`   - ${a.name} (${a.content.length} chars)`);
  }

  const anchorContents = anchors.map((a) => `\n─── ${a.name} ───\n${a.content}`).join('\n\n');

  const prompt = `You are a senior software architect analyzing a project for the first time.

## COMPLETE PROJECT STRUCTURE:
\`\`\`
${treeStructure}
\`\`\`

## KEY FILES (full content):
${anchorContents}

${existingMemories}

## YOUR TASK:
Understand the project HOLISTICALLY before analyzing specific code.

Analyze:
1. What is the main purpose of the project?
2. What tech stack does it use?
3. What is the general architecture?
4. What are the main areas/modules?
5. Which areas need deep analysis and which do you already understand well?
6. What language (human language) is used in the project's documentation, comments, and variable names?

Respond ONLY with this JSON (no markdown, no explanations):
{
  "projectName": "project name",
  "purpose": "2-3 sentence description of purpose",
  "techStack": ["tech1", "tech2", ...],
  "architecture": "2-3 sentence architecture description",
  "language": "detected language for output (English, Spanish, Portuguese, French, etc.)",
  "areas": [
    {
      "name": "Area name",
      "path": "relative/path/",
      "needsDeepAnalysis": true,
      "keyFiles": ["file1.ts", "file2.ts"],
      "reason": "Why it needs or doesn't need deep analysis"
    }
  ]
}

IMPORTANT:
- Detect the project's main language from README, comments, and code style
- All your future outputs should be in the detected language
- needsDeepAnalysis=false if you already understand the area from anchor files
- needsDeepAnalysis=true only for areas with complex business logic requiring inspection
- Be selective: better to deeply analyze 3-5 important areas than superficially 20`;

  const messages = [{ role: 'user' as const, content: prompt }];
  const responseStream = model.sendRequest(messages, token);

  let fullResponse = '';
  for await (const chunk of responseStream) {
    fullResponse += chunk;
    channel.append(chunk);
  }

  // Parse JSON response
  const fallback = createFallbackProjectContext(rootPath, anchors, existingMemories);
  const parsedContext = parseProjectContextResponse(fullResponse, fallback);
  if (parsedContext === fallback) {
    channel.appendLine('\nWarning: invalid AI context response; using deterministic fallback.');
    Logger.getInstance().warn('AI context response was invalid; deterministic fallback used.');
  } else {
    channel.appendLine(`\nDetected language: ${parsedContext.language}`);
  }
  return parsedContext;

  /* Legacy parser retained below for reference during migration.
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = fullResponse;
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const detectedLang = parsed.language || 'English';
    channel.appendLine(`\n\n🌐 Detected language: ${detectedLang}`);

    return {
      projectName: parsed.projectName || 'Unknown',
      purpose: parsed.purpose || '',
      techStack: parsed.techStack || [],
      architecture: parsed.architecture || '',
      areas: parsed.areas || [],
      existingMemories,
      language: detectedLang,
    };
  } catch (e) {
    channel.appendLine(`\n⚠️ Error parsing context: ${e}`);
    return {
      projectName: basename(rootPath),
      purpose: '',
      techStack: [],
      architecture: '',
      areas: [],
      existingMemories,
      language: 'English',
    };
  }
  */
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

import { Logger } from './logger';

export async function scanProjectWithAI(
  projectPath: string,
  token: vscode.CancellationToken,
  store?: MemoryStore,
  webview?: AIScanWebview,
  onMemorySaved?: OnMemorySaved,
  refreshTree?: () => void,
  secrets?: vscode.SecretStorage,
  options: {
    mode?: ScanRunMode;
    accessInformation?: vscode.LanguageModelAccessInformation;
  } = {}
): Promise<AIScanResult> {
  const mode = options.mode || 'manual';
  const interactive = mode === 'manual';
  const logger = Logger.getInstance();
  const channel = getOutputChannel();
  channel.clear();
  if (shouldShowScanSurfaces(mode)) channel.show(true);

  // Sync logger with UI channel
  const log = (msg: string) => {
    channel.appendLine(msg);
    logger.info(msg);
  };

  log('═══════════════════════════════════════════════════════════════');
  log('🧠 CORTEX AI SCAN - Análisis Contextual Jerárquico');
  log('═══════════════════════════════════════════════════════════════\n');

  // Select model (hybrid: native or Gemini API)
  webview?.setStatus('selecting', 'Seleccionando modelo AI...');
  log('🔍 Seleccionando mejor modelo...');

  let adapter: ModelAdapter;
  let nativeModel: vscode.LanguageModelChat | undefined;

  try {
    const result = await selectBestModel(channel, secrets, projectPath, {
      interactive,
      accessInformation: options.accessInformation,
    });
    adapter = result.adapter;
    nativeModel = result.nativeModel;
  } catch (error: unknown) {
    // biome-ignore lint/suspicious/noExplicitAny: Error object is loosely typed
    const err = error as any;
    logger.error('Model selection failed', err);

    if (error instanceof NoProviderAvailableError) {
      log('\nℹ️ No hay un proveedor AI configurado; se omite el escaneo automático.');
      return { memories: [], filesAnalyzed: 0, modelUsed: 'none', savedCount: 0 };
    }

    // Handle connection refused/network errors specifically
    if (err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED')) {
      log('\n❌ Error de conexión con el proveedor AI.');
      log('   Posibles causas:');
      log('   - Ollama no está corriendo (ejecute `ollama serve`)');
      log('   - LM Studio/LocalAI no está escuchando en el puerto esperado');
      log('   - Sin conexión a internet (para Gemini/OpenAI)');

      webview?.setStatus('error', 'Error: AI Provider unreachable');
      if (interactive) {
        vscode.window.showErrorMessage('Cortex: Cannot connect to AI provider. Is Ollama running?');
      }
      return { memories: [], filesAnalyzed: 0, modelUsed: 'none', savedCount: 0 };
    }

    // Handle clipboard fallback request
    if (err.message === 'CLIPBOARD_FALLBACK') {
      log('\\n📋 Usuario solicitó copiar prompt al portapapeles...');
      webview?.setStatus('selecting', 'Generando prompt para copiar...');

      // Generate tree structure for the prompt
      const treeStructure = generateTreeStructure(projectPath);
      const anchors = readAnchorFiles(projectPath);
      const anchorContents = anchors
        .map((a) => `\\n─── ${a.name} ───\\n${a.content}`)
        .join('\\n\\n');

      const clipboardPrompt = `You are a senior software architect. Analyze this project and extract key knowledge as memories.

## PROJECT STRUCTURE:
\`\`\`
${treeStructure.slice(0, 15000)}
\`\`\`

## KEY FILES:
${anchorContents.slice(0, 30000)}

## TASK:
1. Understand the project's purpose, tech stack, and architecture
2. Identify the main areas/modules
3. Extract important memories about:
   - Architecture decisions
   - Key components and their responsibilities
   - Important patterns and conventions
   - Configuration and setup requirements
   - API contracts and interfaces

Respond with a list of memories in this format:
[TYPE] Content of the memory
- Tags: tag1, tag2
- Source: file or area

Types: architecture, component, pattern, decision, api, config, workflow`;

      await vscode.env.clipboard.writeText(clipboardPrompt);
      vscode.window.showInformationMessage(
        '📋 Analysis prompt copied to clipboard! Paste it in Antigravity, Cursor, or any AI chat.'
      );

      log('✅ Prompt copiado al portapapeles');
      webview?.setStatus('complete', 'Prompt copied - paste in your AI chat');

      return { memories: [], filesAnalyzed: 0, modelUsed: 'clipboard', savedCount: 0 };
    }
    throw error;
  }

  const modelName = adapter.name;
  const _model = nativeModel; // For backward compatibility with existing code

  // Get available models for webview display
  const allModels = vscode.lm?.selectChatModels ? await vscode.lm.selectChatModels({}) : [];
  const availableModelNames =
    allModels.length > 0
      ? allModels.slice(0, 15).map((m) => m.name || m.id || 'Unknown')
      : [modelName]; // Just show the Gemini model if no native models
  webview?.setModel(modelName, availableModelNames);

  // For now, the internal functions require native vscode.LanguageModelChat
  // TODO: Refactor all internal functions to use ModelAdapter interface
  // No need to throw error if no native model, as we have fallback logic in selectBestModel
  if (!adapter) {
    throw new Error(
      `No AI model adapter available. Please install a compatible extension or configure an API key.`
    );
  }

  // Generate tree
  webview?.setStatus('selecting', 'Analizando estructura...');
  log('\n📂 Generando estructura del proyecto...');
  const treeStructure = generateTreeStructure(projectPath);
  log(`✓ Árbol generado: ${treeStructure.split('\n').length} líneas`);
  webview?.setTree(treeStructure, { lines: treeStructure.split('\n').length });

  // Load existing memories
  let existingContext = '';
  if (store) {
    try {
      const existing = await store.list({});
      existingContext = formatExistingMemories(existing);
      if (existing.length > 0) {
        log(`\n🧹 Cargadas ${existing.length} memorias existentes para deduplicación`);
      }
    } catch {
      /* skip */
    }
  }

  // ========== PHASE 1 ==========
  log('\n───────────────────────────────────────────────────────────────');
  log('📋 FASE 1: Construcción de Contexto Global');
  log('───────────────────────────────────────────────────────────────\n');
  webview?.setStatus('analyzing', 'Fase 1: Comprendiendo proyecto globalmente...');

  const context = await buildProjectContext(
    adapter,
    projectPath,
    treeStructure,
    existingContext,
    channel,
    webview,
    token
  );

  log(`\n\n✓ Proyecto: ${context.projectName}`);
  log(`✓ Propósito: ${context.purpose}`);
  log(`✓ Stack: ${context.techStack.join(', ')}`);
  log(`✓ Language: ${context.language}`);
  log(`✓ Áreas identificadas: ${context.areas.length}`);

  // Send project context to webview
  webview?.setProjectContext(context.projectName, context.techStack);

  // Mark areas with initial status
  const areasWithStatus = context.areas.map((a) => ({
    ...a,
    status: (a.needsDeepAnalysis ? 'pending' : 'skipped') as 'pending' | 'skipped',
  }));
  webview?.setAreas?.(areasWithStatus);

  const areasNeedingAnalysis = context.areas.filter((a) => a.needsDeepAnalysis);
  log(`✓ Áreas que requieren análisis profundo: ${areasNeedingAnalysis.length}`);

  webview?.setSelectedFiles(areasNeedingAnalysis.flatMap((a) => a.keyFiles));

  // ========== PHASE 2 ==========
  log('\n───────────────────────────────────────────────────────────────');
  log('🔬 PHASE 2: Directed Deep Analysis');
  log('───────────────────────────────────────────────────────────────');
  webview?.setStatus('analyzing', 'Phase 2: Deep analysis of key areas...');

  const allMemories: AIMemory[] = [];
  let filesAnalyzed = 0;
  let savedCount = 0;

  // Helper to save memory in real-time
  const saveMemoryRealTime = async (memory: AIMemory) => {
    if (store) {
      try {
        await store.add({
          content: memory.content,
          type: memory.type,
          source: memory.source,
          tags: memory.tags,
        });
        savedCount++;
        log(`   💾 Saved: [${memory.type}] ${memory.content.substring(0, 50)}...`);
        onMemorySaved?.(memory, savedCount);
        refreshTree?.();
      } catch (e) {
        log(`   ⚠️ Failed to save: ${e}`);
      }
    }
  };

  log(`\n📋 FASE 2: Análisis Detallado (Paralelo: ${areasNeedingAnalysis.length} áreas)`);
  webview?.setStatus(
    'analyzing',
    `Analizando ${areasNeedingAnalysis.length} áreas simultáneamente...`
  );

  // Run analysis SEQUENTIALLY to avoid rate limits (429)
  // Especially important for Gemini Free Tier
  for (const area of areasNeedingAnalysis) {
    // Update area status to analyzing
    webview?.updateAreaStatus(area.name, 'analyzing');

    try {
      if (token.isCancellationRequested) break;

      const areaMemories = await analyzeAreaWithRealTimeSave(
        adapter,
        projectPath,
        area,
        context,
        channel,
        webview,
        token,
        saveMemoryRealTime
      );

      allMemories.push(...areaMemories);
      filesAnalyzed += area.keyFiles.length;

      // Update area status to complete
      webview?.updateAreaStatus(area.name, 'complete', areaMemories.length);
      log(`   ✓ ${area.name}: ${areaMemories.length} memorias`);

      // Gentle pause between areas to let API breathe (Configurable)
      // Defaults to 1000ms, effectively sequential processing
      const delay = CortexConfig.scan.delayMs;
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    } catch (error) {
      log(`   ❌ Error en área ${area.name}: ${error}`);
      webview?.updateAreaStatus(area.name, 'error');
    }
  }

  // ========== PHASE 3 ==========
  log('\n───────────────────────────────────────────────────────────────');
  log('🧠 PHASE 3: High-Level Synthesis');
  log('───────────────────────────────────────────────────────────────');
  webview?.setStatus('analyzing', 'Phase 3: Synthesis and consolidation...');

  const highLevelMemories = await synthesizeHighLevelMemoriesWithRealTimeSave(
    adapter,
    context,
    allMemories,
    channel,
    webview,
    token,
    saveMemoryRealTime
  );
  allMemories.push(...highLevelMemories);

  // Complete
  webview?.setStatus('complete', `Saved ${savedCount} memories`);
  webview?.setSummary(allMemories.length, filesAnalyzed, modelName);

  log('\n\n═══════════════════════════════════════════════════════════════');
  log(`✅ ANALYSIS COMPLETE`);
  log(`   📊 Memories extracted: ${allMemories.length}`);
  log(`   💾 Memories saved: ${savedCount}`);
  log(`   📁 Files analyzed: ${filesAnalyzed}`);
  log(`   🤖 Model: ${modelName}`);
  log(`   📋 Areas analyzed: ${areasNeedingAnalysis.length}/${context.areas.length}`);
  log('═══════════════════════════════════════════════════════════════');

  return { memories: allMemories, filesAnalyzed, modelUsed: modelName, savedCount };
}

// Wrapper for analyzeArea that saves memories in real-time
export async function analyzeAreaWithRealTimeSave(
  model: ModelAdapter,
  rootPath: string,
  area: ProjectArea,
  context: ProjectContext,
  channel: vscode.OutputChannel,
  webview: AIScanWebview | undefined,
  token: vscode.CancellationToken,
  saveMemory: (memory: AIMemory) => Promise<void>
): Promise<AIMemory[]> {
  channel.appendLine(`\n🔍 Analyzing: ${area.name} (${area.path})`);

  const fileContents: { path: string; content: string }[] = [];

  for (const file of area.keyFiles) {
    let content: string | null = null;
    let resolvedPath = file;

    const exactPath = join(rootPath, file);
    content = readFileSafe(exactPath);

    if (!content && area.path) {
      const areaPath = join(rootPath, area.path, basename(file));
      content = readFileSafe(areaPath);
      if (content) resolvedPath = join(area.path, basename(file));
    }

    if (!content && area.path) {
      const directPath = join(rootPath, area.path, file);
      content = readFileSafe(directPath);
      if (content) resolvedPath = join(area.path, file);
    }

    // Check inside src/ if standard structure
    if (!content && area.path && !file.includes('src/')) {
      const srcPath = join(rootPath, area.path, 'src', file);
      content = readFileSafe(srcPath);
      if (content) resolvedPath = join(area.path, 'src', file);
    }

    if (content) {
      fileContents.push({ path: resolvedPath, content });
      if (webview) {
        webview.postMessage({ type: 'scanFile', file: resolvedPath });
      }
    } else {
      // Don't show scary warning, just log info as we have directory fallback
      // log(`   ⚠️ Not found: ${file}`);
    }
  }

  if (fileContents.length === 0 && area.path) {
    channel.appendLine(`   🔄 Fallback: scanning directory ${area.path}...`);
    const areaDir = join(rootPath, area.path);
    try {
      if (existsSync(areaDir) && statSync(areaDir).isDirectory()) {
        const entries = readdirSync(areaDir, { withFileTypes: true });
        const relevantFiles = entries
          .filter((e) => e.isFile() && !e.name.startsWith('.'))
          .slice(0, 10);

        for (const entry of relevantFiles) {
          const filePath = join(areaDir, entry.name);
          const content = readFileSafe(filePath);
          if (content) {
            const relativePath = join(area.path, entry.name);
            fileContents.push({ path: relativePath, content });
            channel.appendLine(`   📄 ${relativePath} (${content.length} chars)`);
          }
        }
      }
    } catch (e) {
      channel.appendLine(`   ⚠️ Error scanning directory: ${e}`);
    }
  }

  if (fileContents.length === 0) {
    channel.appendLine(`   ⚠️ Could not read files for this area`);
    return [];
  }

  const filesText = fileContents.map((f) => `\n─── ${f.path} ───\n${f.content}`).join('\n\n');

  const prompt = `You are a software architect analyzing the "${area.name}" area of a project.

## OUTPUT LANGUAGE: ${context.language}
All memory content must be written in ${context.language}.

## GLOBAL PROJECT CONTEXT:
- Name: ${context.projectName}
- Purpose: ${context.purpose}
- Stack: ${context.techStack.join(', ')}
- Architecture: ${context.architecture}

## AREA TO ANALYZE: ${area.name}
Path: ${area.path}
Reason for deep analysis: ${area.reason}

## FILES:
${filesText}

${context.existingMemories}

## YOUR TASK:
Extract ALL important memories from this area. For each insight, output one JSON line:
{"type": "fact|decision|config|code", "content": "detailed description in ${context.language}", "tags": ["tag1", "tag2"]}

Types:
- "fact": Information about what it does, purpose, business domain
- "decision": Architectural decisions, chosen patterns, conventions
- "config": Configuration, environment variables, deployment
- "code": Important code patterns, APIs, key utilities

CRITICAL REQUIREMENTS:
1. Be VERY SPECIFIC - mention function names, classes, paths, versions
2. Each memory must be USEFUL for a new developer
3. DO NOT repeat existing memories
4. No length limits - write as much as needed to be useful
5. Only output valid JSON, one memory per line
6. ALL CONTENT MUST BE IN ${context.language}

Begin analysis:`;

  const messages = [{ role: 'user' as const, content: prompt }];
  const responseStream = model.sendRequest(messages, token);

  const memories: AIMemory[] = [];
  let currentLine = '';

  for await (const chunk of responseStream) {
    channel.append(chunk);
    webview?.streamChunk(chunk);

    currentLine += chunk;
    if (currentLine.includes('\n')) {
      const parts = currentLine.split('\n');
      for (let i = 0; i < parts.length - 1; i++) {
        const line = parts[i].trim();
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.content && parsed.type) {
              const memory: AIMemory = {
                content: parsed.content,
                type: parsed.type as MemoryType,
                source: `ai-scan:${area.name}`,
                tags: [
                  ...(parsed.tags || []),
                  'ai-extracted',
                  area.name.toLowerCase().replace(/\s+/g, '-'),
                ],
              };
              memories.push(memory);
              // Save immediately!
              await saveMemory(memory);
            }
          } catch {
            /* skip invalid JSON */
          }
        }
      }
      currentLine = parts[parts.length - 1];
    }
  }

  // Parse remaining line
  if (currentLine.trim().startsWith('{') && currentLine.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(currentLine.trim());
      if (parsed.content && parsed.type) {
        const memory: AIMemory = {
          content: parsed.content,
          type: parsed.type as MemoryType,
          source: `ai-scan:${area.name}`,
          tags: [
            ...(parsed.tags || []),
            'ai-extracted',
            area.name.toLowerCase().replace(/\s+/g, '-'),
          ],
        };
        memories.push(memory);
        await saveMemory(memory);
      }
    } catch {
      /* skip */
    }
  }

  return memories;
}

// Wrapper for synthesizeHighLevelMemories that saves in real-time
async function synthesizeHighLevelMemoriesWithRealTimeSave(
  model: ModelAdapter,
  context: ProjectContext,
  collectedMemories: AIMemory[],
  channel: vscode.OutputChannel,
  _webview: AIScanWebview | undefined,
  token: vscode.CancellationToken,
  saveMemory: (memory: AIMemory) => Promise<void>
): Promise<AIMemory[]> {
  channel.appendLine(`\n\n🧠 Phase 3: High-level synthesis (${context.language})...`);

  const memorySummary = collectedMemories.map((m) => `[${m.type}] ${m.content}`).join('\n');

  const prompt = `You are a software architect who has completed detailed analysis of a project.

## OUTPUT LANGUAGE: ${context.language}
All memory content must be written in ${context.language}.

## PROJECT: ${context.projectName}
Purpose: ${context.purpose}
Stack: ${context.techStack.join(', ')}
Architecture: ${context.architecture}

## ALREADY EXTRACTED MEMORIES:
${memorySummary}

## YOUR TASK:
Generate HIGH-LEVEL memories that complement the existing ones:
1. Architectural decisions that cross multiple areas
2. Project patterns and conventions
3. Critical information for onboarding new developers
4. Important dependencies and their purposes
5. Main data flows

DO NOT repeat what's already in existing memories.
Output one JSON line per memory:
{"type": "fact|decision|config|code", "content": "description in ${context.language}", "tags": ["tag1"]}

Only generate truly new high-level memories (ALL IN ${context.language}):`;

  const messages = [{ role: 'user' as const, content: prompt }];
  const responseStream = model.sendRequest(messages, token);

  const highLevelMemories: AIMemory[] = [];
  let fullResponse = '';

  for await (const chunk of responseStream) {
    fullResponse += chunk;
    channel.append(chunk);
  }

  // Parse JSON lines and save each
  const lines = fullResponse.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.content && parsed.type) {
          const memory: AIMemory = {
            content: parsed.content,
            type: parsed.type as MemoryType,
            source: 'ai-scan:synthesis',
            tags: [...(parsed.tags || []), 'ai-extracted', 'high-level'],
          };
          highLevelMemories.push(memory);
          await saveMemory(memory);
        }
      } catch {
        /* skip */
      }
    }
  }

  return highLevelMemories;
}
