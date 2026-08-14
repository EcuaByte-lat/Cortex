/**
 * Google Gemini API Adapter
 * Direct integration with Gemini API for BYOK support
 * Models: Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 series
 */

import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import * as vscode from 'vscode';
import { AIProvider, CortexConfig } from '../config';
import type { ModelAdapter } from './index';

// Available Gemini models (January 2026)
export const GEMINI_MODELS = {
  // Gemini 3 Series (Next Gen - Preview 2026)
  'gemini-3-pro-preview': { name: 'Gemini 3 Pro (Preview)', maxTokens: 2000000 },
  'gemini-3-flash-preview': { name: 'Gemini 3 Flash (Preview)', maxTokens: 2000000 },

  // Gemini 2.5 Series (Current Stable 2026)
  'gemini-2.5-ultra': { name: 'Gemini 2.5 Ultra', maxTokens: 1000000 },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', maxTokens: 2000000 }, // Contex Window Upgrade
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', maxTokens: 1000000 },
  'gemini-2.5-flash-lite': { name: 'Gemini 2.5 Flash Lite', maxTokens: 1000000 },

  // Experimental / Specialized
  'gemini-2.0-flash-thinking-exp-1219': { name: 'Gemini 2.0 Flash Thinking', maxTokens: 1000000 },
} as const;

export type GeminiModelId = keyof typeof GEMINI_MODELS;

// Default to the most powerful stable model (FREE TIER)
export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-2.5-flash';

/**
 * Model fallback chain - try these in order if primary model fails
 * All models here are available in Gemini API free tier (Jan 2026)
 */
export const GEMINI_MODEL_FALLBACK_CHAIN: GeminiModelId[] = [
  'gemini-2.5-flash', // Primary: Fast, 250 req/day free
  'gemini-2.5-flash-lite', // Fallback 1: Economy, high rate limits
  'gemini-2.5-pro', // Fallback 2: Powerful, 100 req/day free
];

const SECRET_KEY = 'cortex.geminiApiKey';

/**
 * Adapter for direct Gemini API access
 */
export class GeminiModelAdapter implements ModelAdapter {
  readonly provider = 'gemini' as const;
  readonly name: string;
  private model: GenerativeModel;

  constructor(
    genAI: GoogleGenerativeAI,
    private modelId: GeminiModelId = DEFAULT_GEMINI_MODEL
  ) {
    this.name = GEMINI_MODELS[modelId]?.name || modelId;
    this.model = genAI.getGenerativeModel({ model: modelId });
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = this.model.startChat({ history });

    let retries = 0;
    const MAX_RETRIES = 3;
    const INITIAL_BACKOFF_MS = 2000;

    while (true) {
      if (token.isCancellationRequested) break;
      try {
        const result = await chat.sendMessageStream(lastMessage.content);
        for await (const chunk of result.stream) {
          if (token.isCancellationRequested) break;
          const text = chunk.text();
          if (text) yield text;
        }
        break; // Success, exit loop
      } catch (error: unknown) {
        if (token.isCancellationRequested) break;

        const err = error as Error;
        const errorMessage = err.message || String(error);

        // Check for network errors
        const errAny = error as Record<string, unknown>;
        const isNetworkError =
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('network') ||
          errAny.code === 'ECONNRESET';

        // Check for 429 or Quota Exceeded
        const isQuotaError =
          errorMessage.includes('429') ||
          errorMessage.includes('Quota exceeded') ||
          errAny.status === 429;

        // Check for 403 Forbidden (model access issues)
        const isAccessError =
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden') ||
          errorMessage.includes('unregistered callers');

        if ((isQuotaError || isNetworkError) && retries < MAX_RETRIES) {
          retries++;
          let delayMs = INITIAL_BACKOFF_MS * 2 ** (retries - 1);

          // Parse retry delay from error message if available
          const match = errorMessage.match(/retry in (\d+(\.\d+)?)s/);
          if (match?.[1]) {
            delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
          }

          delayMs = Math.min(delayMs, 60000);

          const errorType = isNetworkError ? 'Network error' : 'Rate limit';
          console.warn(
            `[Gemini] ${errorType}. Retrying in ${delayMs}ms (Attempt ${retries}/${MAX_RETRIES})`
          );

          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // For 403/access errors, throw with helpful message
        if (isAccessError) {
          throw new Error(
            `Gemini API access denied. Please check:\n` +
              `1. Your API key is valid (get free key at aistudio.google.com)\n` +
              `2. The Generative Language API is enabled in Google Cloud Console\n` +
              `3. The model '${this.modelId}' is available for your account`
          );
        }

        // For persistent network errors, throw with helpful message
        if (isNetworkError) {
          throw new Error(
            `Network error connecting to Gemini API. Please check:\n` +
              `1. Your internet connection\n` +
              `2. Firewall/proxy settings\n` +
              `3. Try again in a few moments`
          );
        }

        throw error;
      }
    }
  }

  /**
   * Create a Gemini adapter from stored API key
   */
  static async fromSecrets(
    secrets: vscode.SecretStorage,
    modelId?: GeminiModelId
  ): Promise<GeminiModelAdapter | null> {
    // Priority: 1. VS Code Settings, 2. Secret Storage
    let apiKey = CortexConfig.getApiKey(AIProvider.Gemini);

    if (!apiKey) {
      apiKey = (await secrets.get(SECRET_KEY)) || '';
    }

    if (!apiKey) apiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'] || '';

    if (!apiKey) return null;

    // determine model: argument > config > default
    const configuredModel = CortexConfig.getModel(AIProvider.Gemini) as GeminiModelId;
    const finalModelId = modelId || configuredModel || DEFAULT_GEMINI_MODEL;

    const genAI = new GoogleGenerativeAI(apiKey);
    return new GeminiModelAdapter(genAI, finalModelId);
  }

  /**
   * Prompt user for API key and store it
   */
  static async promptForApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      title: 'Gemini API Key',
      prompt: 'Enter your Gemini API key (get one FREE at aistudio.google.com/apikey)',
      password: true,
      placeHolder: 'AIza...',
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await secrets.store(SECRET_KEY, apiKey);
      vscode.window.showInformationMessage('✅ Gemini API key saved');
    }

    return apiKey;
  }

  /**
   * Validate API key by making a simple request
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Use flash for validation as it is cheapest/fastest
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('Hello');
      return true;
    } catch {
      return false;
    }
  }
}
