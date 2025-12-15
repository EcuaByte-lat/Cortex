import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

export interface Memory {
  id?: number;
  content: string;
  type: 'fact' | 'decision' | 'code' | 'config' | 'note';
  source: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
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
    // Get the path to sql-wasm.wasm file
    // require.resolve('sql.js') returns: .../node_modules/sql.js/dist/sql-wasm.js
    // So we go up one level (..) to get to dist/ where sql-wasm.wasm lives
    const require = createRequire(import.meta.url);
    const sqlJsPath = require.resolve('sql.js');
    const wasmBuffer = readFileSync(join(sqlJsPath, '..', 'sql-wasm.wasm'));
    // Convert Buffer to ArrayBuffer
    const wasmBinary = wasmBuffer.buffer.slice(
      wasmBuffer.byteOffset,
      wasmBuffer.byteOffset + wasmBuffer.byteLength
    );

    const SQL = await initSqlJs({
      wasmBinary,
    });

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

    this.db?.run(
      `INSERT INTO memories (content, type, source, tags, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        memory.content,
        memory.type,
        memory.source,
        memory.tags ? JSON.stringify(memory.tags) : null,
        memory.metadata ? JSON.stringify(memory.metadata) : null,
      ]
    );

    const result = this.db?.exec('SELECT last_insert_rowid() as id');
    if (!result || result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to get inserted memory ID');
    }
    const id = result[0].values[0][0] as number;

    this.saveToFile();
    return id;
  }

  async get(id: number): Promise<Memory | null> {
    await this.ensureInitialized();

    const result = this.db?.exec('SELECT * FROM memories WHERE id = ?', [id]);
    if (!result || result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return this.rowToMemory(result[0].columns, result[0].values[0]);
  }

  async search(query: string, options?: { type?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();

    let sql = 'SELECT * FROM memories WHERE content LIKE ?';
    const params: (number | string)[] = [`%${query}%`];

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = this.db?.exec(sql, params);
    if (!result || result.length === 0) return [];

    return result[0].values.map((row: SqlValue[]) => this.rowToMemory(result[0].columns, row));
  }

  async list(options?: { type?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();

    let sql = 'SELECT * FROM memories';
    const params: (number | string)[] = [];

    if (options?.type) {
      sql += ' WHERE type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = this.db?.exec(sql, params);
    if (!result || result.length === 0) return [];

    return result[0].values.map((row: SqlValue[]) => this.rowToMemory(result[0].columns, row));
  }

  async delete(id: number): Promise<boolean> {
    await this.ensureInitialized();

    this.db?.run('DELETE FROM memories WHERE id = ?', [id]);
    this.saveToFile();
    return true;
  }

  async clear(): Promise<number> {
    await this.ensureInitialized();

    const result = this.db?.exec('SELECT COUNT(*) as count FROM memories');
    const count = (result?.[0]?.values[0]?.[0] as number) || 0;

    this.db?.run('DELETE FROM memories');
    this.saveToFile();

    return count;
  }

  async stats(): Promise<{ total: number; byType: Record<string, number> }> {
    await this.ensureInitialized();

    const totalResult = this.db?.exec('SELECT COUNT(*) as count FROM memories');
    const total = (totalResult?.[0]?.values[0]?.[0] as number) || 0;

    const byTypeResult = this.db?.exec(`
      SELECT type, COUNT(*) as count 
      FROM memories 
      GROUP BY type
    `);

    const byType: Record<string, number> = {};
    if (byTypeResult && byTypeResult.length > 0) {
      byTypeResult[0].values.forEach((row: SqlValue[]) => {
        byType[row[0] as string] = row[1] as number;
      });
    }

    return { total, byType };
  }

  private rowToMemory(columns: string[], values: SqlValue[]): Memory {
    const row: Record<string, SqlValue> = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });

    return {
      id: row.id as number,
      content: row.content as string,
      type: row.type as Memory['type'],
      source: row.source as string,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
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
