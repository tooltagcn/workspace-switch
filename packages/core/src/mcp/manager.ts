import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { McpServer, CreateMcpInput, UpdateMcpInput, McpListFilter, McpTransport } from './types.js';

interface McpRow {
  id: string;
  name: string;
  transport: string | null;
  command: string | null;
  url: string | null;
  args_json: string | null;
  env_json: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMcp(row: McpRow, tags: string[]): McpServer {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport as McpTransport | null,
    command: row.command,
    url: row.url,
    args: row.args_json ? JSON.parse(row.args_json) as string[] : [],
    env: row.env_json ? JSON.parse(row.env_json) as Record<string, string> : {},
    description: row.description,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getTagsForMcp(db: Database.Database, mcpId: string): string[] {
  const rows = db
    .prepare(
      `SELECT t.name FROM resource_tag rt
       JOIN tag t ON t.id = rt.tag_id
       WHERE rt.resource_type = 'mcp' AND rt.resource_id = ?
       ORDER BY t.name`,
    )
    .all(mcpId) as Array<{ name: string }>;
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

function applyMcpTags(db: Database.Database, mcpId: string, tagNames: string[]): void {
  db.prepare("DELETE FROM resource_tag WHERE resource_type = 'mcp' AND resource_id = ?").run(
    mcpId,
  );

  for (const tagName of tagNames) {
    const tagId = getOrCreateTag(db, tagName);
    db
      .prepare(
        `INSERT INTO resource_tag (resource_type, resource_id, tag_id) VALUES ('mcp', ?, ?)`,
      )
      .run(mcpId, tagId);
  }
}

export function listMcps(db: Database.Database, filter?: McpListFilter): McpServer[] {
  let rows: McpRow[];

  if (filter?.tags && filter.tags.length > 0) {
    const placeholders = filter.tags.map(() => '?').join(', ');
    const params = [...filter.tags];
    rows = db
      .prepare(
        `SELECT DISTINCT m.* FROM mcp m
         JOIN resource_tag rt ON rt.resource_type = 'mcp' AND rt.resource_id = m.id
         JOIN tag t ON t.id = rt.tag_id
         WHERE t.name IN (${placeholders})
         ORDER BY m.name`,
      )
      .all(...params) as McpRow[];
  } else {
    rows = db.prepare('SELECT * FROM mcp ORDER BY name').all() as McpRow[];
  }

  return rows.map((row) => rowToMcp(row, getTagsForMcp(db, row.id)));
}

export function getMcp(db: Database.Database, id: string): McpServer | null {
  const row = db.prepare('SELECT * FROM mcp WHERE id = ?').get(id) as McpRow | undefined;
  return row ? rowToMcp(row, getTagsForMcp(db, row.id)) : null;
}

export function createMcp(db: Database.Database, input: CreateMcpInput): McpServer {
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO mcp (id, name, transport, command, url, args_json, env_json, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.transport ?? null,
    input.command ?? null,
    input.url ?? null,
    input.args ? JSON.stringify(input.args) : null,
    input.env ? JSON.stringify(input.env) : null,
    input.description ?? null,
    now,
    now,
  );

  if (input.tags && input.tags.length > 0) {
    applyMcpTags(db, id, input.tags);
  }

  return getMcp(db, id)!;
}

export function updateMcp(
  db: Database.Database,
  id: string,
  input: UpdateMcpInput,
): McpServer | null {
  const existing = getMcp(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.transport !== undefined) {
    fields.push('transport = ?');
    values.push(input.transport);
  }
  if (input.command !== undefined) {
    fields.push('command = ?');
    values.push(input.command);
  }
  if (input.url !== undefined) {
    fields.push('url = ?');
    values.push(input.url);
  }
  if (input.args !== undefined) {
    fields.push('args_json = ?');
    values.push(JSON.stringify(input.args));
  }
  if (input.env !== undefined) {
    fields.push('env_json = ?');
    values.push(JSON.stringify(input.env));
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description);
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE mcp SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getMcp(db, id)!;
}

export function deleteMcp(db: Database.Database, id: string): boolean {
  const mcp = getMcp(db, id);
  if (!mcp) return false;

  db.prepare("DELETE FROM resource_tag WHERE resource_type = 'mcp' AND resource_id = ?").run(id);
  db.prepare('DELETE FROM mcp WHERE id = ?').run(id);
  return true;
}

export function addMcpTag(db: Database.Database, mcpId: string, tagName: string): McpServer {
  const mcp = getMcp(db, mcpId);
  if (!mcp) throw new Error(`MCP server not found: ${mcpId}`);

  const tagId = getOrCreateTag(db, tagName);
  db
    .prepare(
      `INSERT OR IGNORE INTO resource_tag (resource_type, resource_id, tag_id) VALUES ('mcp', ?, ?)`,
    )
    .run(mcpId, tagId);

  return getMcp(db, mcpId)!;
}

export function removeMcpTag(db: Database.Database, mcpId: string, tagName: string): McpServer {
  const mcp = getMcp(db, mcpId);
  if (!mcp) throw new Error(`MCP server not found: ${mcpId}`);

  const tag = db.prepare('SELECT id FROM tag WHERE name = ?').get(tagName) as
    | { id: string }
    | undefined;
  if (tag) {
    db
      .prepare(
        `DELETE FROM resource_tag WHERE resource_type = 'mcp' AND resource_id = ? AND tag_id = ?`,
      )
      .run(mcpId, tag.id);
  }

  return getMcp(db, mcpId)!;
}

export function setMcpTags(db: Database.Database, mcpId: string, tagNames: string[]): McpServer {
  const mcp = getMcp(db, mcpId);
  if (!mcp) throw new Error(`MCP server not found: ${mcpId}`);

  applyMcpTags(db, mcpId, tagNames);
  return getMcp(db, mcpId)!;
}
