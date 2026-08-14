import * as vscode from 'vscode';

// Enums must match package.json
export enum AIProvider {
  Auto = 'auto',
  Gemini = 'gemini',
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Mistral = 'mistral',
  DeepSeek = 'deepseek',
  Ollama = 'ollama',
}

export const CortexConfig = {
  get config() {
    return vscode.workspace.getConfiguration('cortex');
  },

  /**
   * Get the configured AI Provider
   */
  get provider(): AIProvider {
    return CortexConfig.config.get<AIProvider>('provider') || AIProvider.Auto;
  },

  /**
   * Get custom model override if set
   */
  get customModel(): string {
    return CortexConfig.config.get<string>('model.custom') || '';
  },

  /**
   * Get API Key for a provider (checks settings first, then secrets)
   * Note: Secrets must be retrieved asynchronously via SecretStorage
   */
  getApiKey(provider: AIProvider): string {
    // Only returns the declarative setting. Secrets are handled by the caller or specialized method.
    return CortexConfig.config.get<string>(`${provider}.apiKey`) || '';
  },

  /**
   * Get Model ID for a provider
   */
  getModel(provider: AIProvider): string {
    const custom = CortexConfig.customModel;
    if (custom) return custom;

    return CortexConfig.config.get<string>(`${provider}.model`) || '';
  },

  /**
   * Analysis Settings
   */
  get scan() {
    return {
      sequential: CortexConfig.config.get<boolean>('scan.sequential') ?? true,
      delayMs: CortexConfig.config.get<number>('scan.delayMs') || 1000,
      depth: CortexConfig.config.get<number>('analysis.depth') || 5,
      maxFiles: CortexConfig.config.get<number>('analysis.maxFiles') || 100,
      chunkSize: CortexConfig.config.get<number>('analysis.chunkSize') || 50000,
      exclude: CortexConfig.config.get<string[]>('analysis.exclude') || [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
      ],
    };
  },

  /**
   * Proactive Settings
   */
  get proactive() {
    return {
      enabled: CortexConfig.config.get<boolean>('proactiveCapture.enabled') ?? true,
      autoScan: CortexConfig.config.get<boolean>('autoScanOnStartup') ?? true,
    };
  },

  /**
   * Determine best provider if 'auto' is selected
   * Logic: Claude > OpenAI > Gemini > Ollama
   * (Simulated logic, caller needs to verify keys)
   */
  get autoProviderOrder(): AIProvider[] {
    return [
      AIProvider.Anthropic,
      AIProvider.OpenAI,
      AIProvider.Gemini,
      AIProvider.DeepSeek,
      AIProvider.Mistral,
      AIProvider.Ollama,
    ];
  },
};
