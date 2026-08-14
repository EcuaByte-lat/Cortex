/**
 * Ollama / Local API Adapter
 * OpenAI-compatible integration for local models
 */

import type * as vscode from 'vscode';
import { CortexConfig } from '../config';
import type { ModelAdapter } from './index';

export class OllamaModelAdapter implements ModelAdapter {
  readonly provider = 'ollama' as const;
  readonly name: string;
  private baseUrl: string;

  constructor(
    private modelId: string,
    baseUrl: string = 'http://localhost:11434'
  ) {
    this.name = `Ollama (${modelId})`;
    // Ensure base URL ends with /v1/chat/completions or compatible endpoint
    // Ollama native API is slightly different, but many local servers support OpenAI format
    // Optimizing for OpenAI-compatible endpoint usually provided by Ollama/LM Studio
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    if (!this.baseUrl.includes('v1')) {
      this.baseUrl = `${this.baseUrl}v1/chat/completions`;
    } else if (!this.baseUrl.includes('chat/completions')) {
      this.baseUrl = `${this.baseUrl}/chat/completions`;
    }
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelId,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        // Fallback to native Ollama API if OpenAI format fails
        // Native: POST /api/chat
        if (this.baseUrl.includes('v1/chat/completions')) {
          yield* this.sendNativeRequest(messages, token);
          return;
        }
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

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
              const content = json.choices?.[0]?.delta?.content;
              if (content) yield content;
              if (content) yield content;
            } catch {
              // ignore parse error
            }
          }
        }
      }
    } catch (_error) {
      // Try native fallback immediately if fetch fails
      yield* this.sendNativeRequest(messages, token);
    }
  }

  // Ollama native API fallback
  private async *sendNativeRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    // Construct native URL from base settings
    // Assuming config is http://localhost:11434
    const configUrl = CortexConfig.config.get<string>('ollama.baseUrl') || 'http://localhost:11434';
    const cleanUrl = configUrl.replace(/\/v1.*/, '').replace(/\/$/, '');
    const nativeUrl = `${cleanUrl}/api/chat`;

    const response = await fetch(nativeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`Ollama Native Error: ${response.statusText}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');
    const decoder = new TextDecoder();

    while (true) {
      if (token.isCancellationRequested) break;
      const { done, value } = await reader.read();
      if (done) break;

      // Ollama native streams individual JSON objects, not SSE "data: "
      const text = decoder.decode(value, { stream: true });
      // Can be multiple JSONs stuck together
      // Simple regex split or bracket counting needed if heavy load
      // For simplicity assuming complete JSONs or simple lines
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) yield json.message.content;
          if (json.done) break;
          if (json.done) break;
        } catch {
          // ignore
        }
      }
    }
  }

  static async fromSecrets(
    _secrets: vscode.SecretStorage,
    modelId?: string
  ): Promise<OllamaModelAdapter | null> {
    const configuredUrl =
      CortexConfig.config.get<string>('ollama.baseUrl') || 'http://localhost:11434';
    const configuredModel =
      CortexConfig.config.get<string>('ollama.model') || 'deepseek-coder:latest';

    // Verify connectivity before returning "valid" adapter for auto-mode
    try {
      // Quick 1s timeout check to local tags endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      // Don't throw on fetch error, just return null
      const response = await fetch(`${configuredUrl.replace(/\/$/, '')}/api/tags`, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeout);

      if (!response?.ok) {
        // Alternatively try a GET if HEAD fails
        const resp2 = await fetch(`${configuredUrl.replace(/\/$/, '')}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
        }).catch(() => null);
        if (!resp2?.ok) return null;
      }

      return new OllamaModelAdapter(modelId || configuredModel, configuredUrl);
    } catch {
      return null;
    }
  }
}
