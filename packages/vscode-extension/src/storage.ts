import initSqlJs, { Database } from 'sql.js';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

export interface Memory {
  id?: number;
  content: string;
  type: 'fact' | 'decision' | 'code' | 'config' | 'note';
  source: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export class MemoryStore {
  private db: Database | null = null;
  private dbPath: string;
  private initPromise: Promise<void>;
  
  constructor(dbPath?: string) {
    const defaultPath = join(homedir(), '.cortex', 'memories.db');
    const dir = join(homedir(), '.cortex');
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    this.dbPath = dbPath || defaultPath;
    this.initPromise = this.initialize();
  }

  private async initialize() {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
    
    // Create schema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('fact', 'decision', 'code', 'config', 'note')),
        source TEXT NOT NULL,
        tags TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)');
    
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
      AFTER UPDATE ON memories
      BEGIN
        UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    
    this.saveToFile();
  }

  private async ensureInitialized() {
    await this.initPromise;
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  private saveToFile() {
    if (!this.db) return;
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
  }

  async add(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await this.ensureInitialized();
    
    this.db!.run(
      `INSERT INTO memories (content, type, source, tags, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        memory.content,
        memory.type,
        memory.source,
        memory.tags ? JSON.stringify(memory.tags) : null,
        memory.metadata ? JSON.stringify(memory.metadata) : null
      ]
    );
    
    const result = this.db!.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0] as number;
    
    this.saveToFile();
    return id;
  }

  async get(id: number): Promise<Memory | null> {
    await this.ensureInitialized();
    
    const result = this.db!.exec('SELECT * FROM memories WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }
    
    return this.rowToMemory(result[0].columns, result[0].values[0]);
  }

  async search(query: string, options?: { type?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();
    
    let sql = 'SELECT * FROM memories WHERE content LIKE ?';
    const params: any[] = [`%${query}%`];
    
    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const result = this.db!.exec(sql, params);
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => this.rowToMemory(result[0].columns, row));
  }

  async list(options?: { type?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();
    
    let sql = 'SELECT * FROM memories';
    const params: any[] = [];
    
    if (options?.type) {
      sql += ' WHERE type = ?';
      params.push(options.type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const result = this.db!.exec(sql, params);
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => this.rowToMemory(result[0].columns, row));
  }

  async delete(id: number): Promise<boolean> {
    await this.ensureInitialized();
    
    this.db!.run('DELETE FROM memories WHERE id = ?', [id]);
    this.saveToFile();
    return true;
  }

  async clear(): Promise<number> {
    await this.ensureInitialized();
    
    const result = this.db!.exec('SELECT COUNT(*) as count FROM memories');
    const count = result[0]?.values[0]?.[0] as number || 0;
    
    this.db!.run('DELETE FROM memories');
    this.saveToFile();
    
    return count;
  }

  async stats(): Promise<{ total: number; byType: Record<string, number> }> {
    await this.ensureInitialized();
    
    const totalResult = this.db!.exec('SELECT COUNT(*) as count FROM memories');
    const total = (totalResult[0]?.values[0]?.[0] as number) || 0;
    
    const byTypeResult = this.db!.exec(`
      SELECT type, COUNT(*) as count 
      FROM memories 
      GROUP BY type
    `);
    
    const byType: Record<string, number> = {};
    if (byTypeResult.length > 0) {
      byTypeResult[0].values.forEach((row: any[]) => {
        byType[row[0] as string] = row[1] as number;
      });
    }
    
    return { total, byType };
  }

  private rowToMemory(columns: string[], values: any[]): Memory {
    const row: any = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    
    return {
      id: row.id,
      content: row.content,
      type: row.type,
      source: row.source,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      this.db = null;
    }
  }
}
