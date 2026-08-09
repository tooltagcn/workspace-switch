import Database from 'better-sqlite3';
import path from 'node:path';
import { migrate } from './migrate.js';

const databases = new Map<string, Database.Database>();

export function getDatabase(dataDir: string): Database.Database {
  const dbPath = path.resolve(dataDir, 'ws.db');
  const existing = databases.get(dbPath);
  if (existing) {
    return existing;
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);

  databases.set(dbPath, db);
  return db;
}

export function closeDatabase(db: Database.Database): void {
  for (const [key, value] of databases.entries()) {
    if (value === db) {
      databases.delete(key);
      break;
    }
  }
  db.close();
}
