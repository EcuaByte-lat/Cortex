/**
 * Mistral AI API Adapter
 * Direct integration with Mistral API
 */

import type * as vscode from 'vscode';
import { AIProvider, CortexConfig } from '../config';
import type { ModelAdapter } from './index';

export const MISTRAL_MODELS = {
  'mistral-large-3': { name: 'Mistral Large 3 (2026)', maxTokens: 128000 },
  'mistral-large-latest': { name: 'Mistral Large (Auto)', maxTokens: 32000 },
  'codestral-25.08': { name: 'Codestral 25.08', maxTokens: 32000 },
  'codestral-latest': { name: 'Codestral (Latest)', maxTokens: 32000 },
  'ministral-3': { name: 'Ministral 3B', maxTokens: 32000 },
} as const;

export type MistralModelId = keyof typeof MISTRAL_MODELS;
const SECRET_KEY = 'cortex.mistralApiKey';

export class MistralModelAdapter implements ModelAdapter {
  readonly provider = 'mistral' as const;
  readonly name: string;

  constructor(
    private apiKey: string,
    private modelId: MistralModelId = 'codestral-latest'
  ) {
    this.name = MISTRAL_MODELS[modelId]?.name || modelId;
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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

    if (!response.ok) throw new Error(`Mistral API Error: ${response.statusText}`);

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
            if (content) yield content;
          } catch {
            // ignore
          }
        }
      }
    }
  }

  static async fromSecrets(
    secrets: vscode.SecretStorage,
    modelId?: MistralModelId
  ): Promise<MistralModelAdapter | null> {
    let apiKey = CortexConfig.getApiKey(AIProvider.Mistral);
    if (!apiKey) apiKey = (await secrets.get(SECRET_KEY)) || '';
    if (!apiKey) apiKey = process.env['MISTRAL_API_KEY'] || '';
    if (!apiKey) return null;

    const configuredModel = CortexConfig.getModel(AIProvider.Mistral) as MistralModelId;
    return new MistralModelAdapter(apiKey, modelId || configuredModel || 'codestral-latest');
  }
}
