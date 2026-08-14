/**
 * OpenAI API Adapter
 * Direct integration with OpenAI API for BYOK support
 * Models: GPT-5, GPT-5 Mini, GPT-4o, o3
 */

import * as vscode from 'vscode';
import { AIProvider, CortexConfig } from '../config';
// import * as vscode from 'vscode';
import type { ModelAdapter } from './index';

// Available OpenAI models (January 2026)
export const OPENAI_MODELS = {
  // GPT-5 Series (Flagship 2026)
  'gpt-5': { name: 'GPT-5', maxTokens: 128000 },
  'gpt-5.2-codex': { name: 'GPT-5.2 Codex', maxTokens: 128000 },
  'gpt-5-turbo': { name: 'GPT-5 Turbo', maxTokens: 128000 },

  // Legacy / Transitional
  'gpt-4.5-preview': { name: 'GPT-4.5 Preview (Legacy)', maxTokens: 128000 },
  'gpt-4o': { name: 'GPT-4o', maxTokens: 128000 },

  // Reasoning Tech (o3 Series)
  'o3-high': { name: 'o3 High Reasoning', maxTokens: 128000 },
  'o3-pro': { name: 'o3 Pro', maxTokens: 128000 },
  'o3-mini': { name: 'o3 Mini', maxTokens: 128000 },
} as const;

export type OpenAIModelId = keyof typeof OPENAI_MODELS;

const SECRET_KEY = 'cortex.openaiApiKey';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIStreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

/**
 * Adapter for direct OpenAI API access
 */
export class OpenAIModelAdapter implements ModelAdapter {
  readonly provider = 'openai' as const;
  readonly name: string;

  constructor(
    private apiKey: string,
    private modelId: OpenAIModelId = 'gpt-4o'
  ) {
    this.name = OPENAI_MODELS[modelId]?.name || modelId;
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const openaiMessages: OpenAIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: openaiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (token.isCancellationRequested) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const chunk: OpenAIStreamChunk = JSON.parse(line.slice(6));
            const content = chunk.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * Create an OpenAI adapter from stored API key
   */
  static async fromSecrets(
    secrets: vscode.SecretStorage,
    modelId?: OpenAIModelId
  ): Promise<OpenAIModelAdapter | null> {
    // Priority: 1. VS Code Settings, 2. Secret Storage
    let apiKey = CortexConfig.getApiKey(AIProvider.OpenAI);

    if (!apiKey) {
      apiKey = (await secrets.get(SECRET_KEY)) || '';
    }

    if (!apiKey) apiKey = process.env['OPENAI_API_KEY'] || '';

    if (!apiKey) return null;

    // determine model: argument > config > default
    const configuredModel = CortexConfig.getModel(AIProvider.OpenAI) as OpenAIModelId;
    const finalModelId = modelId || configuredModel || 'gpt-4o';

    return new OpenAIModelAdapter(apiKey, finalModelId);
  }

  /**
   * Prompt user for API key and store it
   */
  static async promptForApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      title: 'OpenAI API Key',
      prompt: 'Enter your OpenAI API key (get one at platform.openai.com)',
      password: true,
      placeHolder: 'sk-...',
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await secrets.store(SECRET_KEY, apiKey);
      vscode.window.showInformationMessage('✅ OpenAI API key saved');
    }

    return apiKey;
  }
}
