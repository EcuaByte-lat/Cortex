import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { ProjectContext } from './context';

export interface Memory {
  id?: number;
  projectId?: string;  // Hash of project context for isolation
  content: string;
  type: 'fact' | 'decision' | 'code' | 'config' | 'note';
  source: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryStoreOptions {
  dbPath?: string;
  projectId?: string;  // Optional: override auto-detection
  globalMode?: boolean;  // If true, don't filter by project
}

export class MemoryStore {
  private db: Database;
  private projectId: string | null;
  private globalMode: boolean;
  
  constructor(options?: MemoryStoreOptions | string) {
    // Support legacy string parameter for backwards compatibility
    const opts = typeof options === 'string' ? { dbPath: options } : options || {};
    
    const defaultPath = join(homedir(), '.cortex', 'memories.db');
    // Create directory if it doesn't exist
    const dir = join(homedir(), '.cortex');
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(opts.dbPath || defaultPath);
    this.globalMode = opts.globalMode || false;
    this.projectId = this.globalMode ? null : (opts.projectId || ProjectContext.getProjectId());
    
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
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_project_type ON memories(project_id, type)');
    
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
      AFTER UPDATE ON memories
      BEGIN
        UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
  }

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
    
    const result = this.db.query('SELECT last_insert_rowid() as id').get() as any;
    return result.id;
  }

  get(id: number): Memory | null {
    let sql = 'SELECT * FROM memories WHERE id = ?';
    const params: any[] = [id];
    
    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }
    
    const row = this.db.query(sql).get(...params) as any;
    return row ? this.rowToMemory(row) : null;
  }

  search(query: string, options?: { type?: string; limit?: number }): Memory[] {
    let sql = 'SELECT * FROM memories WHERE content LIKE ?';
    const params: any[] = [`%${query}%`];
    
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
    
    const rows = this.db.query(sql).all(...params) as any[];
    return rows.map(row => this.rowToMemory(row));
  }

  list(options?: { type?: string; limit?: number }): Memory[] {
    let sql = 'SELECT * FROM memories';
    const params: any[] = [];
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
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const rows = this.db.query(sql).all(...params) as any[];
    return rows.map(row => this.rowToMemory(row));
  }

  delete(id: number): boolean {
    let sql = 'DELETE FROM memories WHERE id = ?';
    const params: any[] = [id];
    
    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }
    
    this.db.run(sql, params);
    return true;
  }

  clear(): number {
    let countSql = 'SELECT COUNT(*) as count FROM memories';
    let deleteSql = 'DELETE FROM memories';
    const params: any[] = [];
    
    if (!this.globalMode && this.projectId) {
      const condition = ' WHERE project_id = ?';
      countSql += condition;
      deleteSql += condition;
      params.push(this.projectId);
    }
    
    const count = (this.db.query(countSql).get(...params) as any).count;
    this.db.run(deleteSql, params);
    return count;
  }

  stats(): { total: number; byType: Record<string, number>; projectId?: string } {
    const params: any[] = [];
    let whereClause = '';
    
    if (!this.globalMode && this.projectId) {
      whereClause = ' WHERE project_id = ?';
      params.push(this.projectId);
    }
    
    const total = this.db.query(`SELECT COUNT(*) as count FROM memories${whereClause}`).get(...params) as { count: number };
    const byType = this.db.query(`
      SELECT type, COUNT(*) as count 
      FROM memories
      ${whereClause}
      GROUP BY type
    `).all(...params) as Array<{ type: string; count: number }>;
    
    return {
      total: total.count,
      byType: Object.fromEntries(byType.map(({ type, count }) => [type, count])),
      projectId: this.projectId || undefined
    };
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      projectId: row.project_id,
      content: row.content,
      type: row.type,
      source: row.source,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get the current project ID being used for isolation
   */
  getProjectId(): string | null {
    return this.projectId;
  }

  /**
   * Get all unique project IDs in the database
   */
  getAllProjects(): Array<{ projectId: string; count: number }> {
    const rows = this.db.query(`
      SELECT project_id, COUNT(*) as count
      FROM memories
      WHERE project_id IS NOT NULL
      GROUP BY project_id
      ORDER BY count DESC
    `).all() as Array<{ project_id: string; count: number }>;
    
    return rows.map(row => ({
      projectId: row.project_id,
      count: row.count
    }));
  }

  close() {
    this.db.close();
  }
}
