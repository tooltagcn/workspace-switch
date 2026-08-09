import type Database from 'better-sqlite3';
import { SCHEMA_SQL, EXPECTED_TABLES } from './schema.js';

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string): void {
  if (!columnExists(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function migrate(db: Database.Database): void {
  db.exec(SCHEMA_SQL);

  addColumnIfMissing(db, 'mcp', 'test_status', "TEXT NOT NULL DEFAULT 'untested'");
  addColumnIfMissing(db, 'mcp', 'test_error', 'TEXT');
  addColumnIfMissing(db, 'mcp', 'tested_at', 'TEXT');
  addColumnIfMissing(db, 'mcp', 'config_hash', 'TEXT');
  addColumnIfMissing(db, 'resource_agent', 'applied_config_hash', 'TEXT');
  addColumnIfMissing(db, 'project_resource_agent', 'applied_config_hash', 'TEXT');
}

export function verifyMigration(db: Database.Database): boolean {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as Array<{ name: string }>;
  const tableNames = new Set(tables.map((t) => t.name));
  return EXPECTED_TABLES.every((t) => tableNames.has(t));
}
