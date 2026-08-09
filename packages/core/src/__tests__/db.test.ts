import { describe, it, expect, afterEach } from 'vitest';
import { getDatabase } from '../db/index.js';
import { verifyMigration } from '../db/migrate.js';
import { EXPECTED_TABLES } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('SQLite initialization', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it('creates all 7 tables', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    tmpDirs.push(tmpDir);

    const db = getDatabase(tmpDir);
    expect(verifyMigration(db)).toBe(true);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual([...EXPECTED_TABLES].sort());
  });

  it('tables are readable and writable', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    tmpDirs.push(tmpDir);

    const db = getDatabase(tmpDir);

    db.prepare('INSERT INTO agent (id, name, config_dir_name) VALUES (?, ?, ?)').run(
      'test-1',
      'Test Agent',
      '.test',
    );
    const row = db.prepare('SELECT * FROM agent WHERE id = ?').get('test-1') as Record<
      string,
      unknown
    >;
    expect(row).toBeDefined();
    expect(row.name).toBe('Test Agent');
    expect(row.config_dir_name).toBe('.test');
    expect(row.builtin).toBe(0);
    expect(row.enabled).toBe(1);
  });

  it('uses WAL journal mode', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    tmpDirs.push(tmpDir);

    const db = getDatabase(tmpDir);
    const mode = db.pragma('journal_mode', { simple: true });
    expect(mode).toBe('wal');
  });

  it('foreign keys are enabled', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    tmpDirs.push(tmpDir);

    const db = getDatabase(tmpDir);
    const fk = db.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('migration is idempotent', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    tmpDirs.push(tmpDir);

    const db = getDatabase(tmpDir);
    expect(verifyMigration(db)).toBe(true);

    const db2 = getDatabase(tmpDir);
    expect(verifyMigration(db2)).toBe(true);
  });

  it('getDatabase returns same instance for same path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    tmpDirs.push(tmpDir);

    const db1 = getDatabase(tmpDir);
    const db2 = getDatabase(tmpDir);
    expect(db1).toBe(db2);
  });
});
