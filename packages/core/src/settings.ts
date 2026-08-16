import type Database from 'better-sqlite3';

/**
 * App preference key/value storage backed by the `workspace_config` table.
 * Used for UI preferences such as theme and language that should persist
 * across restarts but are not part of the managed agent/skill/mcp metadata.
 */

export function getSetting(db: Database.Database, key: string): string | null {
  const row = db
    .prepare('SELECT value FROM workspace_config WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO workspace_config (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(key, value);
}
