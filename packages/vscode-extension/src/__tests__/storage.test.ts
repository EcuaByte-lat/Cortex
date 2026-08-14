/**
 * Unit tests for MemoryStore
 * Tests initialization, CRUD operations, and error handling
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MemoryStore } from '../storage';

// Mock vscode module BEFORE importing storage
mock.module('vscode', () => ({
  EventEmitter: class {
    fire() {
      // Mock event emitter.
    }
    event = () => {
      // Mock event subscription.
    };
    dispose() {
      // Mock disposal.
    }
  },
  window: {
    showErrorMessage: () => undefined,
  },
}));

describe('MemoryStore', () => {
  let store: MemoryStore;
  let testDir: string;
  let testDbPath: string;
  // Hold reference to the class constructor
  let MemoryStoreClass: new (dbPath?: string) => MemoryStore;

  beforeEach(async () => {
    // Dynamic import to ensure mock is applied first
    const module = await import('../storage');
    MemoryStoreClass = module.MemoryStore;

    // Create unique test directory
    testDir = join(tmpdir(), `cortex-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testDbPath = join(testDir, 'test-memories.db');
  });

  afterEach(() => {
    // Clean up
    if (store) {
      store.close();
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid path', async () => {
      store = new MemoryStoreClass(testDbPath);
      const stats = await store.stats();
      expect(stats.total).toBe(0);
    });

    test('should create db file after initialization', async () => {
      store = new MemoryStoreClass(testDbPath);
      await store.stats(); // Force initialization
      expect(existsSync(testDbPath)).toBe(true);
    });

    test('should handle multiple stores on same db path', async () => {
      store = new MemoryStoreClass(testDbPath);
      await store.add({
        content: 'Test memory',
        type: 'note',
        source: 'test',
        tags: ['test'],
      });
      store.close();

      // Open same db again
      const store2 = new MemoryStoreClass(testDbPath);
      const memories = await store2.list({});
      expect(memories.length).toBe(1);
      expect(memories[0].content).toBe('Test memory');
      store2.close();
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(() => {
      store = new MemoryStoreClass(testDbPath);
    });

    test('should add a memory and return id', async () => {
      const id = await store.add({
        content: 'Test content',
        type: 'fact',
        source: 'test-source',
        tags: ['tag1', 'tag2'],
      });
      expect(id).toBeGreaterThan(0);
    });

    test('should get a memory by id', async () => {
      const id = await store.add({
        content: 'Retrievable content',
        type: 'decision',
        source: 'test',
      });

      const memory = await store.get(id);
      expect(memory).not.toBeNull();
      expect(memory?.content).toBe('Retrievable content');
      expect(memory?.type).toBe('decision');
    });

    test('should return null for non-existent id', async () => {
      const memory = await store.get(99999);
      expect(memory).toBeNull();
    });

    test('should list all memories', async () => {
      await store.add({ content: 'Memory 1', type: 'note', source: 'test' });
      await store.add({ content: 'Memory 2', type: 'fact', source: 'test' });
      await store.add({ content: 'Memory 3', type: 'code', source: 'test' });

      const memories = await store.list({});
      expect(memories.length).toBe(3);
    });

    test('should filter by type', async () => {
      await store.add({ content: 'Note 1', type: 'note', source: 'test' });
      await store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Note 2', type: 'note', source: 'test' });

      const notes = await store.list({ type: 'note' });
      expect(notes.length).toBe(2);
      expect(notes.every((m) => m.type === 'note')).toBe(true);
    });

    test('should update a memory', async () => {
      const id = await store.add({
        content: 'Original',
        type: 'note',
        source: 'test',
      });

      await store.update(id, { content: 'Updated' });

      const memory = await store.get(id);
      expect(memory?.content).toBe('Updated');
    });

    test('should delete a memory', async () => {
      const id = await store.add({
        content: 'To delete',
        type: 'note',
        source: 'test',
      });

      await store.delete(id);

      const memory = await store.get(id);
      expect(memory).toBeNull();
    });

    test('should search memories by content', async () => {
      await store.add({ content: 'Uses React for UI', type: 'fact', source: 'test' });
      await store.add({ content: 'Uses Vue for components', type: 'fact', source: 'test' });
      await store.add({ content: 'Database is PostgreSQL', type: 'config', source: 'test' });

      const results = await store.search('React');
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('React');
    });

    test('should clear all memories', async () => {
      await store.add({ content: 'Memory 1', type: 'note', source: 'test' });
      await store.add({ content: 'Memory 2', type: 'note', source: 'test' });

      const cleared = await store.clear();
      expect(cleared).toBe(2);

      const remaining = await store.list({});
      expect(remaining.length).toBe(0);
    });
  });

  describe('Stats', () => {
    beforeEach(() => {
      store = new MemoryStoreClass(testDbPath);
    });

    test('should return correct stats', async () => {
      await store.add({ content: 'Note', type: 'note', source: 'test' });
      await store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Fact 2', type: 'fact', source: 'test' });
      await store.add({ content: 'Code', type: 'code', source: 'test' });

      const stats = await store.stats();
      expect(stats.total).toBe(4);
      expect(stats.byType.note).toBe(1);
      expect(stats.byType.fact).toBe(2);
      expect(stats.byType.code).toBe(1);
    });
  });

  describe('Tags and Metadata', () => {
    beforeEach(() => {
      store = new MemoryStoreClass(testDbPath);
    });

    test('should store and retrieve tags', async () => {
      const id = await store.add({
        content: 'Tagged memory',
        type: 'note',
        source: 'test',
        tags: ['important', 'review'],
      });

      const memory = await store.get(id);
      expect(memory?.tags).toEqual(['important', 'review']);
    });

    test('should store and retrieve metadata', async () => {
      const id = await store.add({
        content: 'With metadata',
        type: 'decision',
        source: 'test',
        metadata: { author: 'Claude', confidence: 0.95 },
      });

      const memory = await store.get(id);
      expect(memory?.metadata).toEqual({ author: 'Claude', confidence: 0.95 });
    });

    test('should handle null tags gracefully', async () => {
      const id = await store.add({
        content: 'No tags',
        type: 'note',
        source: 'test',
      });

      const memory = await store.get(id);
      expect(memory?.tags).toBeUndefined();
    });
  });

  describe('Project ID', () => {
    beforeEach(() => {
      store = new MemoryStoreClass(testDbPath);
    });

    test('should store and retrieve projectId', async () => {
      const id = await store.add({
        content: 'Project memory',
        type: 'note',
        source: 'test',
        projectId: 'my-project-123',
      });

      const memory = await store.get(id);
      expect(memory?.projectId).toBe('my-project-123');
    });
  });
});
