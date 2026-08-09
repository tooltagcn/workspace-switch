import type Database from 'better-sqlite3';
import { SCHEMA_SQL, EXPECTED_TABLES } from './schema.js';

export function migrate(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}

export function verifyMigration(db: Database.Database): boolean {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as Array<{ name: string }>;
  const tableNames = new Set(tables.map((t) => t.name));
  return EXPECTED_TABLES.every((t) => tableNames.has(t));
}
