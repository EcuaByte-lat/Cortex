/**
 * DeepSeek API Adapter
 * OpenAI-compatible integration
 */

import type * as vscode from 'vscode';
import { AIProvider, CortexConfig } from '../config';
import type { ModelAdapter } from './index';

export const DEEPSEEK_MODELS = {
  'deepseek-v4': { name: 'DeepSeek V4 (2026)', maxTokens: 128000 },
  'deepseek-v3.2': { name: 'DeepSeek V3.2 Agentic', maxTokens: 128000 },
  'deepseek-coder-v4': { name: 'DeepSeek Coder V4', maxTokens: 128000 },
  'deepseek-coder-v3': { name: 'DeepSeek Coder V3', maxTokens: 128000 },
  'deepseek-v3': { name: 'DeepSeek V3', maxTokens: 64000 },
} as const;

export type DeepSeekModelId = keyof typeof DEEPSEEK_MODELS;
const SECRET_KEY = 'cortex.deepseekApiKey';
const BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

export class DeepSeekModelAdapter implements ModelAdapter {
  readonly provider = 'deepseek' as const;
  readonly name: string;

  constructor(
    private apiKey: string,
    private modelId: DeepSeekModelId = 'deepseek-v3'
  ) {
    this.name = DEEPSEEK_MODELS[modelId]?.name || modelId;
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`DeepSeek API Error: ${response.statusText}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');

    const decoder = new TextDecoder();
    while (true) {
      if (token.isCancellationRequested) break;
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.substring(6));
            const content = json.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore malformed stream chunks.
          }
        }
      }
    }
  }

  static async fromSecrets(
    secrets: vscode.SecretStorage,
    modelId?: DeepSeekModelId
  ): Promise<DeepSeekModelAdapter | null> {
    let apiKey = CortexConfig.getApiKey(AIProvider.DeepSeek);
    if (!apiKey) apiKey = (await secrets.get(SECRET_KEY)) || '';
    if (!apiKey) return null;

    const configuredModel = CortexConfig.getModel(AIProvider.DeepSeek) as DeepSeekModelId;
    return new DeepSeekModelAdapter(apiKey, modelId || configuredModel || 'deepseek-v3');
  }
}
