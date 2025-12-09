import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getProjectId } from './context';

/**
 * Represents a raw database row from SQLite.
 * @internal
 */
interface DatabaseRow {
  id: number;
  project_id: string | null;
  content: string;
  type: 'fact' | 'decision' | 'code' | 'config' | 'note';
  source: string;
  tags: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a single memory entry in the Cortex system.
 *
 * @public
 * @example
 * ```typescript
 * const memory: Memory = {
 *   content: 'API endpoints use RESTful conventions',
 *   type: 'fact',
 *   source: 'docs/api-design.md',
 *   tags: ['architecture', 'api'],
 *   metadata: { author: 'team' }
 * };
 * ```
 */
export interface Memory {
  /** Unique identifier (auto-generated) */
  id?: number;
  /** Project identifier for isolation (auto-detected or manual) */
  projectId?: string;
  /** The actual content/description of the memory */
  content: string;
  /** Category of memory: fact, decision, code, config, or note */
  type: 'fact' | 'decision' | 'code' | 'config' | 'note';
  /** Origin of the memory (file path, URL, conversation, etc.) */
  source: string;
  /** Optional tags for categorization and filtering */
  tags?: string[];
  /** Optional arbitrary metadata as key-value pairs */
  metadata?: Record<string, unknown>;
  /** ISO timestamp of creation (auto-generated) */
  createdAt?: string;
  /** ISO timestamp of last update (auto-updated) */
  updatedAt?: string;
}

/**
 * Configuration options for initializing a MemoryStore.
 *
 * @public
 */
export interface MemoryStoreOptions {
  /** Custom path for SQLite database file. Default: ~/.cortex/memories.db */
  dbPath?: string;
  /** Override automatic project detection with a specific project ID */
  projectId?: string;
  /** Disable project isolation - access all memories globally */
  globalMode?: boolean;
}

/**
 * Main storage class for managing persistent memories using SQLite.
 *
 * Provides CRUD operations, search capabilities, and automatic project isolation.
 * Each MemoryStore instance is scoped to a specific project (auto-detected via git/package.json)
 * unless globalMode is enabled.
 *
 * @public
 * @example
 * ```typescript
 * // Basic usage with auto-detection
 * const store = new MemoryStore();
 * const id = store.add({
 *   content: 'Use Redis for caching',
 *   type: 'decision',
 *   source: 'architecture-meeting'
 * });
 *
 * // Custom database path
 * const store = new MemoryStore({ dbPath: './my-memories.db' });
 *
 * // Global mode (all projects)
 * const store = new MemoryStore({ globalMode: true });
 * ```
 */
export class MemoryStore {
  private db: Database;
  private projectId: string | null;
  private globalMode: boolean;

  /**
   * Creates a new MemoryStore instance.
   *
   * @param options - Configuration options or legacy string path to database file
   * @example
   * ```typescript
   * // Modern approach
   * const store = new MemoryStore({ dbPath: '~/.cortex/memories.db' });
   *
   * // Legacy approach (still supported)
   * const store = new MemoryStore('~/.cortex/memories.db');
   * ```
   */
  constructor(options?: MemoryStoreOptions | string) {
    // Support legacy string parameter for backwards compatibility
    const opts = typeof options === 'string' ? { dbPath: options } : options || {};

    const defaultPath = join(homedir(), '.cortex', 'memories.db');
    // Create directory if it doesn't exist
    const dir = join(homedir(), '.cortex');
    if (!require('node:fs').existsSync(dir)) {
      require('node:fs').mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(opts.dbPath || defaultPath);
    this.globalMode = opts.globalMode || false;
    this.projectId = this.globalMode ? null : opts.projectId || getProjectId();

    this.initialize();
  }

  private initialize() {
    // Create memories table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('fact', 'decision', 'code', 'config', 'note')),
        source TEXT NOT NULL,
        tags TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for efficient queries
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)');
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_project_type ON memories(project_id, type)'
    );

    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
      AFTER UPDATE ON memories
      BEGIN
        UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
  }

  /**
   * Adds a new memory to the store.
   *
   * @param memory - Memory object without id/timestamps (auto-generated)
   * @returns The ID of the newly created memory
   * @example
   * ```typescript
   * const id = store.add({
   *   content: 'PostgreSQL for main database',
   *   type: 'decision',
   *   source: 'tech-review-2025',
   *   tags: ['database', 'architecture'],
   *   metadata: { approvedBy: 'tech-lead' }
   * });
   * console.log(`Memory created with ID: ${id}`);
   * ```
   */
  add(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO memories (project_id, content, type, source, tags, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const projectId = memory.projectId || this.projectId;

    stmt.run(
      projectId,
      memory.content,
      memory.type,
      memory.source,
      memory.tags ? JSON.stringify(memory.tags) : null,
      memory.metadata ? JSON.stringify(memory.metadata) : null
    );

    const result = this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
    return result.id;
  }

  /**
   * Retrieves a memory by its ID.
   *
   * Respects project isolation unless in globalMode.
   *
   * @param id - The unique identifier of the memory
   * @returns The memory object or null if not found
   * @example
   * ```typescript
   * const memory = store.get(42);
   * if (memory) {
   *   console.log(memory.content);
   * }
   * ```
   */
  get(id: number): Memory | null {
    let sql = 'SELECT * FROM memories WHERE id = ?';
    const params: (number | string)[] = [id];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    const row = this.db.query(sql).get(...params) as DatabaseRow | undefined;
    return row ? this.rowToMemory(row) : null;
  }

  /**
   * Searches memories by content using SQL LIKE pattern matching.
   *
   * @param query - Search term (case-insensitive, partial match)
   * @param options - Optional filters for type and result limit
   * @returns Array of matching memories, ordered by creation date (newest first)
   * @example
   * ```typescript
   * // Simple search
   * const results = store.search('database');
   *
   * // Search with filters
   * const decisions = store.search('api', { type: 'decision', limit: 10 });
   * ```
   */
  search(query: string, options?: { type?: string; limit?: number }): Memory[] {
    let sql = 'SELECT * FROM memories WHERE content LIKE ?';
    const params: (number | string)[] = [`%${query}%`];

    // Add project isolation unless in global mode
    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.query(sql).all(...params) as DatabaseRow[];
    return rows.map((row) => this.rowToMemory(row));
  }

  /**
   * Lists all memories, optionally filtered by type and limited by count.
   *
   * @param options - Optional filters for type and result limit
   * @returns Array of memories, ordered by creation date (newest first)
   * @example
   * ```typescript
   * // All memories
   * const all = store.list();
   *
   * // Only facts, limited to 20
   * const facts = store.list({ type: 'fact', limit: 20 });
   *
   * // All decisions
   * const decisions = store.list({ type: 'decision' });
   * ```
   */
  list(options?: { type?: string; limit?: number }): Memory[] {
    let sql = 'SELECT * FROM memories';
    const params: (number | string)[] = [];
    const conditions: string[] = [];

    // Add project isolation unless in global mode
    if (!this.globalMode && this.projectId) {
      conditions.push('project_id = ?');
      params.push(this.projectId);
    }

    if (options?.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.query(sql).all(...params) as DatabaseRow[];
    return rows.map((row) => this.rowToMemory(row));
  }

  /**
   * Deletes a memory by its ID.
   *
   * Respects project isolation unless in globalMode.
   *
   * @param id - The unique identifier of the memory to delete
   * @returns true if deletion was successful
   * @example
   * ```typescript
   * store.delete(42);
   * ```
   */
  delete(id: number): boolean {
    let sql = 'DELETE FROM memories WHERE id = ?';
    const params: (number | string)[] = [id];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    this.db.run(sql, params);
    return true;
  }

  /**
   * Clears all memories from the current project.
   *
   * ⚠️ DANGER: This operation cannot be undone!
   * Respects project isolation unless in globalMode.
   *
   * @returns Number of memories deleted
   * @example
   * ```typescript
   * const count = store.clear();
   * console.log(`Deleted ${count} memories`);
   * ```
   */
  clear(): number {
    let countSql = 'SELECT COUNT(*) as count FROM memories';
    let deleteSql = 'DELETE FROM memories';
    const params: (number | string)[] = [];

    if (!this.globalMode && this.projectId) {
      const condition = ' WHERE project_id = ?';
      countSql += condition;
      deleteSql += condition;
      params.push(this.projectId);
    }

    const count = (this.db.query(countSql).get(...params) as { count: number }).count;
    this.db.run(deleteSql, params);
    return count;
  }

  /**
   * Returns statistics about stored memories.
   *
   * @returns Object containing total count, breakdown by type, and current project ID
   * @example
   * ```typescript
   * const stats = store.stats();
   * console.log(`Total: ${stats.total}`);
   * console.log(`Facts: ${stats.byType.fact || 0}`);
   * console.log(`Decisions: ${stats.byType.decision || 0}`);
   * console.log(`Project: ${stats.projectId}`);
   * ```
   */
  stats(): { total: number; byType: Record<string, number>; projectId?: string } {
    const params: (number | string)[] = [];
    let whereClause = '';

    if (!this.globalMode && this.projectId) {
      whereClause = ' WHERE project_id = ?';
      params.push(this.projectId);
    }

    const total = this.db
      .query(`SELECT COUNT(*) as count FROM memories${whereClause}`)
      .get(...params) as { count: number };
    const byType = this.db
      .query(`
      SELECT type, COUNT(*) as count 
      FROM memories
      ${whereClause}
      GROUP BY type
    `)
      .all(...params) as Array<{ type: string; count: number }>;

    return {
      total: total.count,
      byType: Object.fromEntries(byType.map(({ type, count }) => [type, count])),
      projectId: this.projectId || undefined,
    };
  }

  private rowToMemory(row: DatabaseRow): Memory {
    return {
      id: row.id,
      projectId: row.project_id ?? undefined,
      content: row.content,
      type: row.type,
      source: row.source,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Gets the current project ID being used for isolation.
   *
   * @returns The project ID hash or null if in globalMode
   * @example
   * ```typescript
   * const projectId = store.getProjectId();
   * console.log(`Current project: ${projectId}`);
   * ```
   */
  getProjectId(): string | null {
    return this.projectId;
  }

  /**
   * Gets all unique project IDs stored in the database with memory counts.
   *
   * Useful for understanding which projects have memories stored.
   *
   * @returns Array of objects containing projectId and count, sorted by count (descending)
   * @example
   * ```typescript
   * const projects = store.getAllProjects();
   * projects.forEach(p => {
   *   console.log(`${p.projectId}: ${p.count} memories`);
   * });
   * ```
   */
  getAllProjects(): Array<{ projectId: string; count: number }> {
    const rows = this.db
      .query(`
      SELECT project_id, COUNT(*) as count
      FROM memories
      WHERE project_id IS NOT NULL
      GROUP BY project_id
      ORDER BY count DESC
    `)
      .all() as Array<{ project_id: string; count: number }>;

    return rows.map((row) => ({
      projectId: row.project_id,
      count: row.count,
    }));
  }

  /**
   * Closes the database connection.
   *
   * Should be called when the MemoryStore is no longer needed to free resources.
   *
   * @example
   * ```typescript
   * store.close();
   * ```
   */
  close() {
    this.db.close();
  }
}
