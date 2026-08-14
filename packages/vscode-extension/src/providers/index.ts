/**
 * Multi-Provider AI Model Adapters
 * Supports: Google Gemini, OpenAI, Anthropic
 *
 * These adapters provide a unified interface for AI model access
 * across different providers, enabling the AI Scanner to work
 * with any configured provider in any editor.
 *
 * Editors supported:
 * - VS Code (vscode.lm API + BYOK)
 * - Antigravity (same as VS Code, native Gemini 3)
 * - Cursor (BYOK via settings)
 * - Windsurf (SWE-1 + VS Code extensions)
 * - Zed (Agent Panel + settings.json)
 */

import * as vscode from 'vscode';

/**
 * Unified interface for AI model interactions
 */
export interface ModelAdapter {
  readonly name: string;
  readonly provider:
    | 'vscode'
    | 'gemini'
    | 'openai'
    | 'anthropic'
    | 'mistral'
    | 'deepseek'
    | 'ollama'
    | 'codex'
    | 'claude'
    | 'gemini-cli'
    | 'copilot';
  sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string>;
}

/**
 * All available providers with their recommended models
 */
export const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    topModel: 'gemini-2.5-pro', // gemini-3.x is still in preview
    thinkingModel: 'gemini-2.0-flash-thinking-exp-01-21',
    freeApiUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    topModel: 'gpt-5.2-codex',
    freeApiUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    topModel: 'claude-4.5-opus',
    freeApiUrl: 'https://console.anthropic.com/settings/keys',
  },
  mistral: {
    name: 'Mistral AI',
    defaultModel: 'codestral-latest',
    topModel: 'mistral-large-latest',
    freeApiUrl: 'https://console.mistral.ai/',
  },
  deepseek: {
    name: 'DeepSeek',
    defaultModel: 'deepseek-v3',
    topModel: 'deepseek-coder-v4',
    freeApiUrl: 'https://platform.deepseek.com/',
  },
  ollama: {
    name: 'Ollama (Local)',
    defaultModel: 'deepseek-coder:latest',
    topModel: 'deepseek-coder:v4',
    freeApiUrl: 'https://ollama.com/',
  },
  codex: {
    name: 'OpenAI Codex CLI',
    defaultModel: 'configured-by-codex',
    topModel: 'configured-by-codex',
    freeApiUrl: 'https://developers.openai.com/codex/cli/',
  },
  claude: {
    name: 'Claude Code CLI',
    defaultModel: 'configured-by-claude',
    topModel: 'configured-by-claude',
    freeApiUrl: 'https://docs.anthropic.com/en/docs/claude-code',
  },
  copilot: {
    name: 'GitHub Copilot CLI',
    defaultModel: 'auto',
    topModel: 'auto',
    freeApiUrl: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-getting-started',
  },
  auto: {
    name: 'Auto-Detect',
    defaultModel: 'auto',
    topModel: 'auto',
    freeApiUrl: '',
  },
} as const;

export type ProviderName = keyof typeof PROVIDERS;

/**
 * Model priority for automatic selection (2026 Benchmarks)
 */
export const MODEL_PRIORITY = [
  // Tier 1: Frontier Logic (Code & Reasoning)
  { id: 'claude-4.5-opus', provider: 'anthropic' as const },
  { id: 'gpt-5.2-codex', provider: 'openai' as const },
  { id: 'gemini-2.5-pro', provider: 'gemini' as const }, // 3.x still in preview

  // Tier 2: High Performance & Speed
  { id: 'claude-3-7-sonnet-20250219', provider: 'anthropic' as const },
  { id: 'gpt-5-turbo', provider: 'openai' as const },
  { id: 'deepseek-coder-v4', provider: 'deepseek' as const },

  // Tier 3: Workhorses (Smart & Fast)
  { id: 'claude-3-5-sonnet-20241022', provider: 'anthropic' as const },
  { id: 'gpt-4o', provider: 'openai' as const },
  { id: 'gemini-2.5-pro', provider: 'gemini' as const },
  { id: 'mistral-large-latest', provider: 'mistral' as const },

  // Tier 4: Economy / Flash / Local
  { id: 'gemini-2.5-flash', provider: 'gemini' as const },
  { id: 'deepseek-v3', provider: 'deepseek' as const },
  { id: 'gpt-4o-mini', provider: 'openai' as const },
  { id: 'codestral-latest', provider: 'mistral' as const },
];

/**
 * Adapter for native VS Code Language Model API
 * Works with GitHub Copilot, Gemini Code Assist, or any registered provider
 */
export class VSCodeModelAdapter implements ModelAdapter {
  readonly provider = 'vscode' as const;
  readonly name: string;

  constructor(private model: vscode.LanguageModelChat) {
    this.name = model.name || model.id || 'VS Code Model';
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const vsMessages = messages.map((m) =>
      m.role === 'user'
        ? vscode.LanguageModelChatMessage.User(m.content)
        : vscode.LanguageModelChatMessage.Assistant(m.content)
    );

    const response = await this.model.sendRequest(vsMessages, {}, token);

    for await (const chunk of response.text) {
      yield chunk;
    }
  }
}

export { ANTHROPIC_MODELS, AnthropicModelAdapter, type AnthropicModelId } from './anthropic';
export { CliModelAdapter, FallbackModelAdapter } from './cli';
export { DEEPSEEK_MODELS, DeepSeekModelAdapter, type DeepSeekModelId } from './deepseek';
export { GEMINI_MODELS, GeminiModelAdapter, type GeminiModelId } from './gemini';
export { MISTRAL_MODELS, MistralModelAdapter, type MistralModelId } from './mistral';
export { OllamaModelAdapter } from './ollama';
export { OPENAI_MODELS, OpenAIModelAdapter, type OpenAIModelId } from './openai';
