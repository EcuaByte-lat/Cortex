/**
 * Anthropic Claude API Adapter
 * Direct integration with Anthropic API for BYOK support
 * Models: Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
 */

import * as vscode from 'vscode';
import { AIProvider, CortexConfig } from '../config';
// import * as vscode from 'vscode';
import type { ModelAdapter } from './index';

// Available Anthropic models (January 2026)
export const ANTHROPIC_MODELS = {
  // Claude 4.5 Series (2026 Flagship)
  'claude-4.5-opus': { name: 'Claude 4.5 Opus', maxTokens: 200000 },
  'claude-4.5-sonnet': { name: 'Claude 4.5 Sonnet', maxTokens: 200000 },

  // Legacy High-Performance
  'claude-3-7-sonnet': { name: 'Claude 3.7 Sonnet', maxTokens: 200000 },
  'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet (v2)', maxTokens: 200000 },

  // Specialized
  'claude-3-5-haiku': { name: 'Claude 3.5 Haiku', maxTokens: 200000 },
} as const;

export type AnthropicModelId = keyof typeof ANTHROPIC_MODELS;

const SECRET_KEY = 'cortex.anthropicApiKey';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicStreamEvent {
  type: string;
  delta?: { text?: string };
}

/**
 * Adapter for direct Anthropic API access
 */
export class AnthropicModelAdapter implements ModelAdapter {
  readonly provider = 'anthropic' as const;
  readonly name: string;

  constructor(
    private apiKey: string,
    private modelId: AnthropicModelId = 'claude-4.5-sonnet'
  ) {
    this.name = ANTHROPIC_MODELS[modelId]?.name || modelId;
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2024-01-01',
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 8192,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
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
        if (line.startsWith('data: ')) {
          try {
            const event: AnthropicStreamEvent = JSON.parse(line.slice(6));
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * Create an Anthropic adapter from stored API key
   */
  static async fromSecrets(
    secrets: vscode.SecretStorage,
    modelId?: AnthropicModelId
  ): Promise<AnthropicModelAdapter | null> {
    // Priority: 1. VS Code Settings, 2. Secret Storage
    let apiKey = CortexConfig.getApiKey(AIProvider.Anthropic);

    if (!apiKey) {
      apiKey = (await secrets.get(SECRET_KEY)) || '';
    }

    if (!apiKey) apiKey = process.env['ANTHROPIC_API_KEY'] || '';

    if (!apiKey) return null;

    // determine model: argument > config > default
    const configuredModel = CortexConfig.getModel(AIProvider.Anthropic) as AnthropicModelId;
    const finalModelId = modelId || configuredModel || 'claude-3-5-sonnet-20241022';

    return new AnthropicModelAdapter(apiKey, finalModelId);
  }

  /**
   * Prompt user for API key and store it
   */
  static async promptForApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      title: 'Anthropic API Key',
      prompt: 'Enter your Anthropic API key (get one at console.anthropic.com)',
      password: true,
      placeHolder: 'sk-ant-...',
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await secrets.store(SECRET_KEY, apiKey);
      vscode.window.showInformationMessage('✅ Anthropic API key saved');
    }

    return apiKey;
  }
}
