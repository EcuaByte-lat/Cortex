/**
 * Tests for embeddings provider module.
 * @module @ecuabyte/cortex-core/embeddings.test
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  cosineSimilarity,
  createEmbeddingProvider,
  deserializeEmbedding,
  OllamaEmbeddings,
  OpenAIEmbeddings,
  serializeEmbedding,
} from './embeddings';

describe('Embeddings', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
    });

    it('should handle normalized vectors', () => {
      const v1 = [Math.SQRT1_2, Math.SQRT1_2];
      const v2 = [Math.SQRT1_2, Math.SQRT1_2];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1);
    });

    it('should throw for vectors of different lengths', () => {
      expect(() => cosineSimilarity([1], [1, 2])).toThrow();
    });

    it('should handle zero vectors gracefully', () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });

  describe('serializeEmbedding / deserializeEmbedding', () => {
    it('should serialize and deserialize correctly', () => {
      const embedding = [0.1, 0.2, -0.3, 0.4];
      const serialized = serializeEmbedding(embedding);
      const deserialized = deserializeEmbedding(serialized);

      expect(deserialized.length).toBe(embedding.length);
      for (let i = 0; i < embedding.length; i++) {
        const expected = embedding[i];
        const actual = deserialized[i];
        if (expected === undefined || actual === undefined) {
          throw new Error('Embedding round-trip changed vector length');
        }
        expect(actual).toBeCloseTo(expected);
      }
    });

    it('should handle empty embedding', () => {
      const serialized = serializeEmbedding([]);
      const deserialized = deserializeEmbedding(serialized);
      expect(deserialized).toEqual([]);
    });

    it('should produce correct byte length', () => {
      const embedding = [1, 2, 3];
      const serialized = serializeEmbedding(embedding);
      expect(serialized.byteLength).toBe(3 * 4); // 4 bytes per float
    });
  });

  describe('OllamaEmbeddings', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should create instance with default config', () => {
      const provider = new OllamaEmbeddings();
      expect(provider.model).toBe('nomic-embed-text');
      expect(provider.dimensions).toBe(768);
    });

    it('should create instance with custom config', () => {
      const provider = new OllamaEmbeddings({ model: 'bge-m3' });
      expect(provider.model).toBe('bge-m3');
      expect(provider.dimensions).toBe(1024);
    });

    it('should return false for isAvailable when Ollama is not running', async () => {
      globalThis.fetch = mock(async () => {
        throw new Error('Connection refused');
      });

      const provider = new OllamaEmbeddings();
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should return match when model is available', async () => {
      globalThis.fetch = mock(
        async () =>
          new Response(
            JSON.stringify({
              models: [{ name: 'nomic-embed-text:latest' }],
            })
          )
      );

      const provider = new OllamaEmbeddings({ model: 'nomic-embed-text' });
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should embed batch successfully', async () => {
      const mockEmbeddings = [
        [0.1, 0.2],
        [0.3, 0.4],
      ];
      globalThis.fetch = mock(
        async () =>
          new Response(
            JSON.stringify({
              embeddings: mockEmbeddings,
            })
          )
      );

      const provider = new OllamaEmbeddings();
      const result = await provider.embedBatch(['a', 'b']);
      expect(result).toEqual(mockEmbeddings);
    });

    it('should throw on embed error', async () => {
      globalThis.fetch = mock(async () => new Response('Error', { status: 500 }));
      const provider = new OllamaEmbeddings();
      expect(provider.embed('test')).rejects.toThrow();
    });
  });

  describe('OpenAIEmbeddings', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should initialize with API key', () => {
      const provider = new OpenAIEmbeddings({ apiKey: 'test' });
      expect(provider.model).toBe('text-embedding-3-small');
      expect(provider.dimensions).toBe(1536);
    });

    it('should embed batch using OpenAI API', async () => {
      const mockData = {
        data: [
          { embedding: [0.1, 0.2], index: 0 },
          { embedding: [0.3, 0.4], index: 1 },
        ],
      };
      globalThis.fetch = mock(async (url, init) => {
        expect(url).toBe('https://api.openai.com/v1/embeddings');
        // @ts-expect-error
        expect(JSON.parse(init.body).model).toBe('text-embedding-3-small');
        return new Response(JSON.stringify(mockData));
      });

      const provider = new OpenAIEmbeddings({ apiKey: 'sk-test' });
      const result = await provider.embedBatch(['a', 'b']);
      expect(result).toEqual([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
    });
  });

  describe('createEmbeddingProvider', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should prefer Ollama if available', async () => {
      globalThis.fetch = mock(async (url) => {
        if (url.toString().includes('tags')) {
          return new Response(JSON.stringify({ models: [{ name: 'nomic-embed-text' }] }));
        }
        return new Response('{}');
      });

      const provider = await createEmbeddingProvider({ openaiApiKey: 'sk-test' });
      expect(provider).toBeInstanceOf(OllamaEmbeddings);
    });

    it('should fallback to OpenAI if Ollama unavailable', async () => {
      globalThis.fetch = mock(async (url) => {
        if (url.toString().includes('tags')) {
          throw new Error('Down');
        }
        return new Response('{}');
      });

      const provider = await createEmbeddingProvider({ openaiApiKey: 'sk-test' });
      expect(provider).toBeInstanceOf(OpenAIEmbeddings);
    });
  });
});
