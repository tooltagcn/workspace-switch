import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Skill, CreateSkillInput, UpdateSkillInput, SkillListFilter } from './types.js';

interface SkillRow {
  id: string;
  name: string;
  description: string | null;
  source_path: string | null;
  created_at: string;
  updated_at: string;
}

function rowToSkill(row: SkillRow, tags: string[]): Skill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourcePath: row.source_path,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getTagsForSkill(db: Database.Database, skillId: string): string[] {
  const rows = db
    .prepare(
      `SELECT t.name FROM resource_tag rt
       JOIN tag t ON t.id = rt.tag_id
       WHERE rt.resource_type = 'skill' AND rt.resource_id = ?
       ORDER BY t.name`,
    )
    .all(skillId) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

function getOrCreateTag(db: Database.Database, tagName: string): string {
  const existing = db.prepare('SELECT id FROM tag WHERE name = ?').get(tagName) as
    | { id: string }
    | undefined;
  if (existing) return existing.id;

  const id = randomUUID();
  db.prepare('INSERT INTO tag (id, name) VALUES (?, ?)').run(id, tagName);
  return id;
}

export function listSkills(db: Database.Database, filter?: SkillListFilter): Skill[] {
  const joins: string[] = [];
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.tags && filter.tags.length > 0) {
    joins.push(
      `JOIN resource_tag rt ON rt.resource_type = 'skill' AND rt.resource_id = s.id`,
      `JOIN tag t ON t.id = rt.tag_id`,
    );
    conditions.push(`t.name IN (${filter.tags.map(() => '?').join(', ')})`);
    params.push(...filter.tags);
  }

  if (filter?.agentId) {
    conditions.push(
      `EXISTS (SELECT 1 FROM resource_agent ra
               WHERE ra.resource_type = 'skill' AND ra.resource_id = s.id AND ra.agent_id = ?)`,
    );
    params.push(filter.agentId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = ['SELECT DISTINCT s.*', 'FROM skill s', ...joins, where, 'ORDER BY s.name']
    .filter(Boolean)
    .join(' ');
  const rows = db.prepare(sql).all(...params) as SkillRow[];

  return rows.map((row) => rowToSkill(row, getTagsForSkill(db, row.id)));
}

export function getSkill(db: Database.Database, id: string): Skill | null {
  const row = db.prepare('SELECT * FROM skill WHERE id = ?').get(id) as SkillRow | undefined;
  return row ? rowToSkill(row, getTagsForSkill(db, row.id)) : null;
}

export function createSkill(db: Database.Database, input: CreateSkillInput): Skill {
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO skill (id, name, description, source_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.name, input.description ?? null, input.sourcePath ?? null, now, now);

  if (input.tags && input.tags.length > 0) {
    setSkillTags(db, id, input.tags);
  }

  return getSkill(db, id)!;
}

export function updateSkill(
  db: Database.Database,
  id: string,
  input: UpdateSkillInput,
): Skill | null {
  const existing = getSkill(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description);
  }
  if (input.sourcePath !== undefined) {
    fields.push('source_path = ?');
    values.push(input.sourcePath);
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE skill SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getSkill(db, id)!;
}

export function deleteSkill(db: Database.Database, id: string): boolean {
  const skill = getSkill(db, id);
  if (!skill) return false;

  db.prepare("DELETE FROM resource_tag WHERE resource_type = 'skill' AND resource_id = ?").run(id);
  db.prepare('DELETE FROM skill WHERE id = ?').run(id);
  return true;
}

export function addTag(db: Database.Database, skillId: string, tagName: string): Skill {
  const skill = getSkill(db, skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  const tagId = getOrCreateTag(db, tagName);
  db
    .prepare(
      `INSERT OR IGNORE INTO resource_tag (resource_type, resource_id, tag_id) VALUES ('skill', ?, ?)`,
    )
    .run(skillId, tagId);

  return getSkill(db, skillId)!;
}

export function removeTag(db: Database.Database, skillId: string, tagName: string): Skill {
  const skill = getSkill(db, skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  const tag = db.prepare('SELECT id FROM tag WHERE name = ?').get(tagName) as
    | { id: string }
    | undefined;
  if (tag) {
    db
      .prepare(
        `DELETE FROM resource_tag WHERE resource_type = 'skill' AND resource_id = ? AND tag_id = ?`,
      )
      .run(skillId, tag.id);
  }

  return getSkill(db, skillId)!;
}

export function setTags(db: Database.Database, skillId: string, tagNames: string[]): Skill {
  const skill = getSkill(db, skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  setSkillTags(db, skillId, tagNames);
  return getSkill(db, skillId)!;
}

function setSkillTags(db: Database.Database, skillId: string, tagNames: string[]): void {
  db.prepare("DELETE FROM resource_tag WHERE resource_type = 'skill' AND resource_id = ?").run(
    skillId,
  );

  for (const tagName of tagNames) {
    const tagId = getOrCreateTag(db, tagName);
    db
      .prepare(
        `INSERT INTO resource_tag (resource_type, resource_id, tag_id) VALUES ('skill', ?, ?)`,
      )
      .run(skillId, tagId);
  }
}

export interface CreateManualSkillOptions {
  skillsDir: string;
  name: string;
  description: string;
}

export interface ManualSkillResult {
  name: string;
  dir: string;
  skillMdPath: string;
}

export function createSkillManually(options: CreateManualSkillOptions): ManualSkillResult {
  const { skillsDir, name, description } = options;

  const skillDir = path.join(skillsDir, name);
  if (fs.existsSync(skillDir)) {
    throw new Error(`Skill "${name}" already exists in ${skillsDir}`);
  }

  fs.mkdirSync(skillDir, { recursive: true });

  const skillMd = `---
name: ${name}
description: ${description}
---

# ${name}

${description}

## Usage

Describe how to use this skill here.

## Examples

Add examples of how this skill is used.
`;

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillMdPath, skillMd, 'utf-8');

  return { name, dir: skillDir, skillMdPath };
}
