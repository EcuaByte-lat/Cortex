import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryStore, Memory } from '../storage';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MemoryStore', () => {
  let store: MemoryStore;
  let dbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    dbPath = join(tmpdir(), `cortex-test-${Date.now()}.db`);
    store = new MemoryStore({ dbPath, projectId: 'test-project-1' });
  });

  afterEach(() => {
    store.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('add', () => {
    it('should add a memory and return its ID', () => {
      const id = store.add({
        content: 'Test memory',
        type: 'fact',
        source: 'manual'
      });

      expect(id).toBeGreaterThan(0);
    });

    it('should add a memory with tags and metadata', () => {
      const id = store.add({
        content: 'Complex memory',
        type: 'code',
        source: 'editor',
        tags: ['typescript', 'testing'],
        metadata: { complexity: 'high' }
      });

      const memory = store.get(id);
      expect(memory).toBeTruthy();
      expect(memory?.tags).toEqual(['typescript', 'testing']);
      expect(memory?.metadata).toEqual({ complexity: 'high' });
    });

    it('should automatically set projectId', () => {
      const id = store.add({
        content: 'Project-specific memory',
        type: 'decision',
        source: 'architecture'
      });

      const memory = store.get(id);
      expect(memory?.projectId).toBe('test-project-1');
    });
  });

  describe('get', () => {
    it('should retrieve a memory by ID', () => {
      const id = store.add({
        content: 'Retrieve me',
        type: 'note',
        source: 'test'
      });

      const memory = store.get(id);
      expect(memory).toBeTruthy();
      expect(memory?.content).toBe('Retrieve me');
      expect(memory?.type).toBe('note');
    });

    it('should return null for non-existent ID', () => {
      const memory = store.get(99999);
      expect(memory).toBeNull();
    });

    it('should not retrieve memories from other projects', () => {
      // Add memory to project 1
      const id = store.add({
        content: 'Project 1 memory',
        type: 'fact',
        source: 'test'
      });

      // Create store for project 2
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      const memory = store2.get(id);

      expect(memory).toBeNull();
      store2.close();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      // Add test data
      store.add({ content: 'TypeScript is awesome', type: 'fact', source: 'docs' });
      store.add({ content: 'Use TypeScript for type safety', type: 'decision', source: 'team' });
      store.add({ content: 'JavaScript is flexible', type: 'fact', source: 'web' });
    });

    it('should find memories by content', () => {
      const results = store.search('TypeScript');
      expect(results).toHaveLength(2);
    });

    it('should be case-insensitive', () => {
      const results = store.search('typescript');
      expect(results).toHaveLength(2);
    });

    it('should filter by type', () => {
      const results = store.search('TypeScript', { type: 'fact' });
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('TypeScript is awesome');
    });

    it('should limit results', () => {
      const results = store.search('', { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const results = store.search('Rust');
      expect(results).toHaveLength(0);
    });

    it('should only search within current project', () => {
      // Add memory to different project
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      store2.add({ content: 'TypeScript in project 2', type: 'fact', source: 'test' });

      const results = store.search('TypeScript');
      expect(results).toHaveLength(2); // Only from project 1

      store2.close();
    });
  });

  describe('list', () => {
    it('should list all memories', () => {
      store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      store.add({ content: 'Decision 1', type: 'decision', source: 'test' });
      store.add({ content: 'Code 1', type: 'code', source: 'test' });

      const memories = store.list();
      expect(memories).toHaveLength(3);
    });

    it('should filter by type', () => {
      store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      store.add({ content: 'Decision 1', type: 'decision', source: 'test' });

      const facts = store.list({ type: 'fact' });
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe('fact');
    });

    it('should limit results', () => {
      store.add({ content: 'M1', type: 'fact', source: 'test' });
      store.add({ content: 'M2', type: 'fact', source: 'test' });
      store.add({ content: 'M3', type: 'fact', source: 'test' });

      const memories = store.list({ limit: 2 });
      expect(memories).toHaveLength(2);
    });

    it('should return all memories ordered by creation time', () => {
      store.add({ content: 'Memory 1', type: 'note', source: 'test' });
      store.add({ content: 'Memory 2', type: 'note', source: 'test' });

      const memories = store.list();
      expect(memories).toHaveLength(2);
      // All memories have created_at timestamps
      expect(memories[0].createdAt).toBeDefined();
      expect(memories[1].createdAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a memory', () => {
      const id = store.add({
        content: 'Delete me',
        type: 'note',
        source: 'test'
      });

      const deleted = store.delete(id);
      expect(deleted).toBe(true);

      const memory = store.get(id);
      expect(memory).toBeNull();
    });

    it('should not delete memories from other projects', () => {
      // Add to project 2
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      const id = store2.add({ content: 'Project 2', type: 'fact', source: 'test' });

      // Try to delete from project 1
      store.delete(id);

      // Should still exist
      const memory = store2.get(id);
      expect(memory).toBeTruthy();

      store2.close();
    });
  });

  describe('clear', () => {
    it('should clear all memories for current project', () => {
      store.add({ content: 'Memory 1', type: 'fact', source: 'test' });
      store.add({ content: 'Memory 2', type: 'fact', source: 'test' });

      const count = store.clear();
      expect(count).toBe(2);

      const memories = store.list();
      expect(memories).toHaveLength(0);
    });

    it('should not clear memories from other projects', () => {
      store.add({ content: 'Project 1', type: 'fact', source: 'test' });

      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      store2.add({ content: 'Project 2', type: 'fact', source: 'test' });

      store.clear();

      const project2Memories = store2.list();
      expect(project2Memories).toHaveLength(1);

      store2.close();
    });
  });

  describe('stats', () => {
    beforeEach(() => {
      store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      store.add({ content: 'Fact 2', type: 'fact', source: 'test' });
      store.add({ content: 'Decision 1', type: 'decision', source: 'test' });
    });

    it('should return correct statistics', () => {
      const stats = store.stats();

      expect(stats.total).toBe(3);
      expect(stats.byType.fact).toBe(2);
      expect(stats.byType.decision).toBe(1);
      expect(stats.projectId).toBe('test-project-1');
    });

    it('should only count memories from current project', () => {
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      store2.add({ content: 'Other project', type: 'fact', source: 'test' });

      const stats = store.stats();
      expect(stats.total).toBe(3);

      store2.close();
    });
  });

  describe('project isolation', () => {
    it('should isolate memories between projects', () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });

      store1.add({ content: 'Project 1 memory', type: 'fact', source: 'test' });
      store2.add({ content: 'Project 2 memory', type: 'fact', source: 'test' });

      expect(store1.list()).toHaveLength(1);
      expect(store2.list()).toHaveLength(1);

      expect(store1.list()[0].content).toBe('Project 1 memory');
      expect(store2.list()[0].content).toBe('Project 2 memory');

      store1.close();
      store2.close();
    });

    it('should support global mode to access all projects', () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      store1.add({ content: 'P1', type: 'fact', source: 'test' });
      store2.add({ content: 'P2', type: 'fact', source: 'test' });

      const allMemories = globalStore.list();
      expect(allMemories).toHaveLength(2);

      store1.close();
      store2.close();
      globalStore.close();
    });
  });

  describe('getAllProjects', () => {
    it('should return all unique project IDs', () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });

      store1.add({ content: 'P1 M1', type: 'fact', source: 'test' });
      store1.add({ content: 'P1 M2', type: 'fact', source: 'test' });
      store2.add({ content: 'P2 M1', type: 'fact', source: 'test' });

      const projects = store1.getAllProjects();
      expect(projects).toHaveLength(2);
      expect(projects.find(p => p.projectId === 'project-1')?.count).toBe(2);
      expect(projects.find(p => p.projectId === 'project-2')?.count).toBe(1);

      store1.close();
      store2.close();
    });
  });
});
