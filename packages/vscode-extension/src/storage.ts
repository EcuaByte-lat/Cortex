import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IMemoryStore, Memory } from '@ecuabyte/cortex-shared';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import * as vscode from 'vscode';

export class MemoryStore implements IMemoryStore {
  private db: Database | null = null;
  private dbPath: string;
  private projectId: string | null = null;
  private initPromise: Promise<void>;
  private initError: Error | null = null;
  private _onDidAdd = new vscode.EventEmitter<Memory>();
  public readonly onDidAdd = this._onDidAdd.event;

  public isInitialized(): { ready: boolean; error: string | null } {
    return {
      ready: this.db !== null,
      error: this.initError ? this.initError.message : null,
    };
  }

  constructor(dbPath?: string, extensionPath?: string, projectId?: string) {
    const defaultPath = join(homedir(), '.cortex', 'memories.db');
    const dir = join(homedir(), '.cortex');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.dbPath = dbPath || defaultPath;
    this.projectId = projectId || null;
    this.initPromise = this.initialize(extensionPath).catch((error) => {
      console.error('[Cortex] MemoryStore initialization failed:', error);
      this.initError = error instanceof Error ? error : new Error(String(error));
      // Re-throw so ensureInitialized can catch it
      throw this.initError;
    });
  }

  private async initialize(extensionPath?: string) {
    try {
      // Try to find sql-wasm.wasm in multiple locations
      const possiblePaths: string[] = [];

      // 1. If extensionPath is provided (reliable VS Code way)
      if (extensionPath) {
        possiblePaths.push(join(extensionPath, 'dist', 'sql-wasm.wasm'));
        possiblePaths.push(join(extensionPath, 'sql-wasm.wasm'));
      }

      // 2. Same directory as the bundled extension.js (dist folder usually)
      const currentDir = typeof __dirname !== 'undefined' ? __dirname : '.';
      possiblePaths.push(join(currentDir, 'sql-wasm.wasm'));

      // 3. Fallback: if we are in 'src', check 'dist' sibling
      if (currentDir.endsWith('/src') || currentDir.endsWith('\\src')) {
        possiblePaths.push(join(currentDir, '..', 'dist', 'sql-wasm.wasm'));
      }

      // 4. Try node_modules path via require.resolve (for development)
      try {
        const require = createRequire(import.meta.url);
        const sqlJsPath = require.resolve('sql.js');
        possiblePaths.push(join(sqlJsPath, '..', 'sql-wasm.wasm'));
      } catch {
        // require.resolve may fail in bundled context
      }

      // Find the first existing WASM file
      let wasmPath: string | null = null;
      for (const path of possiblePaths) {
        console.log(`[Cortex] Checking WASM path: ${path}`);
        if (existsSync(path)) {
          wasmPath = path;
          console.log(`[Cortex] Found sql-wasm.wasm at: ${path}`);
          break;
        }
      }

      if (!wasmPath) {
        throw new Error(`sql-wasm.wasm not found. Checked paths:\n${possiblePaths.join('\n')}`);
      }

      const wasmBuffer = readFileSync(wasmPath);
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
        try {
          this.db = new SQL.Database(buffer);
          console.log(`[Cortex] Loaded database from ${this.dbPath}`);
        } catch (error) {
          console.error('[Cortex] Failed to load existing database:', error);
          throw new Error(
            `Failed to load database: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        console.log(`[Cortex] Creating new database at ${this.dbPath}`);
        this.db = new SQL.Database();
      }

      if (!this.db) {
        throw new Error('Failed to create SQL.js database instance');
      }

      // Create schema
      this.db.run(`
        CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('fact', 'decision', 'code', 'config', 'note')),
          source TEXT NOT NULL,
          project_id TEXT,
          tags TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure project_id column exists for older databases
      try {
        this.db.run('ALTER TABLE memories ADD COLUMN project_id TEXT');
      } catch {
        // Column already exists or other non-critical error
      }

      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id)');

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_memories_timestamp
        AFTER UPDATE ON memories
        BEGIN
          UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);

      // Fix for "no such module: fts5" error
      // If the DB was created by the CLI/Core (which uses Bun:sqlite with FTS5),
      // the triggers will exist but sql.js (wasm) might not support FTS5.
      // We safely drop them here to allow basic CRUD operations to work.
      try {
        const triggers = ['memories_ai', 'memories_ad', 'memories_bu', 'memories_au'];
        for (const trigger of triggers) {
          this.db.run(`DROP TRIGGER IF EXISTS ${trigger}`);
        }
      } catch (e) {
        console.warn('[Cortex] Failed to clean up FTS5 triggers:', e);
      }

      this.saveToFile();
    } catch (error) {
      console.error('[Cortex] Failed to initialize MemoryStore:', error);
      throw error; // Let ensureInitialized catch it via initPromise
    }
  }

  private async ensureInitialized() {
    // If there was an initialization error, provide a clear message
    if (this.initError) {
      throw new Error(
        `Database initialization failed: ${this.initError.message}. Try restarting the extension.`
      );
    }

    try {
      await this.initPromise;
    } catch (error) {
      // Store the error for future calls
      if (!this.initError) {
        this.initError = error instanceof Error ? error : new Error(String(error));
      }
      throw new Error(`Database failed to initialize: ${this.initError.message}`);
    }

    if (!this.db) {
      throw new Error(
        'Database not available. Please restart VS Code or check if ~/.cortex directory is accessible.'
      );
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
      `INSERT INTO memories (content, type, source, project_id, tags, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        memory.content,
        memory.type,
        memory.source,
        memory.projectId || this.projectId,
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

    // Notify listeners
    this._onDidAdd.fire({
      id,
      content: memory.content,
      type: memory.type,
      source: memory.source,
      projectId: memory.projectId || this.projectId || undefined,
      tags: memory.tags,
      metadata: memory.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return id;
  }

  async get(id: number): Promise<Memory | null> {
    await this.ensureInitialized();

    let sql = 'SELECT * FROM memories WHERE id = ?';
    const params: (number | string)[] = [id];

    if (this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    const result = this.db?.exec(sql, params);
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

  async list(options?: { type?: string; tag?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();

    let sql = 'SELECT * FROM memories';
    const params: (number | string)[] = [];
    const conditions: string[] = [];

    if (this.projectId) {
      conditions.push('project_id = ?');
      params.push(this.projectId);
    }

    if (options?.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }

    if (options?.tag) {
      // Simple string matching for JSON array or text
      conditions.push('tags LIKE ?');
      params.push(`%${options.tag}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
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

  async update(
    id: number,
    memory: Partial<Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    await this.ensureInitialized();

    const updates: string[] = [];
    const params: SqlValue[] = [];

    if (memory.content !== undefined) {
      updates.push('content = ?');
      params.push(memory.content);
    }
    if (memory.type !== undefined) {
      updates.push('type = ?');
      params.push(memory.type);
    }
    if (memory.source !== undefined) {
      updates.push('source = ?');
      params.push(memory.source);
    }
    if (memory.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(memory.tags));
    }
    if (memory.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(memory.metadata));
    }
    if (memory.projectId !== undefined) {
      updates.push('project_id = ?');
      params.push(memory.projectId);
    }

    if (updates.length === 0) return false;

    params.push(id);

    let sql = `UPDATE memories SET ${updates.join(', ')} WHERE id = ?`;

    if (this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    this.db?.run(sql, params);
    this.saveToFile();

    return true;
  }

  async delete(id: number): Promise<boolean> {
    await this.ensureInitialized();

    let sql = 'DELETE FROM memories WHERE id = ?';
    const params: (number | string)[] = [id];

    if (this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    this.db?.run(sql, params);
    this.saveToFile();
    return true;
  }

  async clear(): Promise<number> {
    await this.ensureInitialized();

    let sqlCount = 'SELECT COUNT(*) as count FROM memories';
    let sqlDelete = 'DELETE FROM memories';
    const params: (number | string)[] = [];

    if (this.projectId) {
      const where = ' WHERE project_id = ?';
      sqlCount += where;
      sqlDelete += where;
      params.push(this.projectId);
    }

    const result = this.db?.exec(sqlCount, params);
    const count = (result?.[0]?.values[0]?.[0] as number) || 0;

    this.db?.run(sqlDelete, params);
    this.saveToFile();

    return count;
  }

  async stats(): Promise<{ total: number; byType: Record<string, number>; projectId?: string }> {
    const defaultStats = { total: 0, byType: {} };
    try {
      await this.ensureInitialized();

      const params: (string | number)[] = [];
      let where = '';
      if (this.projectId) {
        where = ' WHERE project_id = ?';
        params.push(this.projectId);
      }

      const totalResult = this.db?.exec(`SELECT COUNT(*) as count FROM memories${where}`, params);
      const total = (totalResult?.[0]?.values[0]?.[0] as number) || 0;

      const byTypeResult = this.db?.exec(`
        SELECT type, COUNT(*) as count
        FROM memories
        ${this.projectId ? `WHERE project_id = '${this.projectId.replace(/'/g, "''")}'` : ''}
        GROUP BY type
      `);

      const byType: Record<string, number> = {};
      if (byTypeResult && byTypeResult.length > 0) {
        byTypeResult[0].values.forEach((row: SqlValue[]) => {
          if (row && row[0] !== null) {
            byType[row[0] as string] = (row[1] as number) || 0;
          }
        });
      }

      return {
        total,
        byType,
        projectId: this.projectId || undefined,
      };
    } catch (error) {
      console.error('[Cortex] Error getting stats:', error);
      // Re-throw if it's an initialization error so the UI can show it
      if (this.initError) {
        throw this.initError;
      }
      return defaultStats;
    }
  }

  private rowToMemory(columns: string[], values: SqlValue[]): Memory {
    if (!columns || !values) {
      throw new Error('Invalid row data');
    }

    const row: Record<string, SqlValue> = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });

    const safeParse = (json: unknown) => {
      if (typeof json !== 'string') return undefined;
      try {
        return JSON.parse(json);
      } catch {
        return undefined;
      }
    };

    return {
      id: (row.id as number) || 0,
      content: (row.content as string) || '',
      type: (row.type as Memory['type']) || 'note',
      source: (row.source as string) || 'unknown',
      projectId: (row.project_id as string) || undefined,
      tags: safeParse(row.tags),
      metadata: safeParse(row.metadata),
      createdAt: (row.created_at as string) || new Date().toISOString(),
      updatedAt: (row.updated_at as string) || new Date().toISOString(),
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
