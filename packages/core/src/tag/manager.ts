import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

export interface RenameTagInput {
  newName: string;
}

interface TagRow {
  id: string;
  name: string;
  color: string | null;
}

function rowToTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color };
}

export function listTags(db: Database.Database): Tag[] {
  const rows = db.prepare('SELECT * FROM tag ORDER BY name').all() as TagRow[];
  return rows.map(rowToTag);
}

export function getTag(db: Database.Database, id: string): Tag | null {
  const row = db.prepare('SELECT * FROM tag WHERE id = ?').get(id) as TagRow | undefined;
  return row ? rowToTag(row) : null;
}

export function getTagByName(db: Database.Database, name: string): Tag | null {
  const row = db.prepare('SELECT * FROM tag WHERE name = ?').get(name) as TagRow | undefined;
  return row ? rowToTag(row) : null;
}

export function createTag(db: Database.Database, input: CreateTagInput): Tag {
  const existing = getTagByName(db, input.name);
  if (existing) {
    throw new Error(`Tag already exists: ${input.name}`);
  }

  const id = randomUUID();
  db.prepare('INSERT INTO tag (id, name, color) VALUES (?, ?, ?)').run(
    id,
    input.name,
    input.color ?? null,
  );
  return getTag(db, id)!;
}

export function renameTag(db: Database.Database, id: string, input: RenameTagInput): Tag | null {
  const existing = getTag(db, id);
  if (!existing) return null;

  const conflict = getTagByName(db, input.newName);
  if (conflict) {
    throw new Error(`Tag name already in use: ${input.newName}`);
  }

  db.prepare('UPDATE tag SET name = ? WHERE id = ?').run(input.newName, id);
  return getTag(db, id)!;
}

export function mergeTags(db: Database.Database, sourceId: string, targetId: string): Tag | null {
  const source = getTag(db, sourceId);
  const target = getTag(db, targetId);
  if (!source || !target) return null;

  const sourceRows = db
    .prepare(
      'SELECT resource_type, resource_id FROM resource_tag WHERE tag_id = ?',
    )
    .all(sourceId) as Array<{ resource_type: string; resource_id: string }>;

  for (const row of sourceRows) {
    db.prepare(
      `INSERT OR IGNORE INTO resource_tag (resource_type, resource_id, tag_id) VALUES (?, ?, ?)`,
    ).run(row.resource_type, row.resource_id, targetId);
  }

  db.prepare("DELETE FROM resource_tag WHERE tag_id = ?").run(sourceId);
  db.prepare("DELETE FROM tag WHERE id = ?").run(sourceId);

  return getTag(db, targetId)!;
}

export function deleteTag(db: Database.Database, id: string): boolean {
  const tag = getTag(db, id);
  if (!tag) return false;

  db.prepare("DELETE FROM resource_tag WHERE tag_id = ?").run(id);
  db.prepare("DELETE FROM tag WHERE id = ?").run(id);
  return true;
}
