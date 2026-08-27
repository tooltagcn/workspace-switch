import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { McpServer, CreateMcpInput, UpdateMcpInput, McpListFilter, McpTransport, McpTestStatus, McpTestResult, McpTool, McpPrompt } from './types.js';
import { computeConfigHash } from './config-hash.js';

interface McpRow {
  id: string;
  name: string;
  transport: string | null;
  command: string | null;
  url: string | null;
  args_json: string | null;
  env_json: string | null;
  description: string | null;
  test_status: string;
  test_error: string | null;
  tested_at: string | null;
  config_hash: string | null;
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
    testStatus: (row.test_status || 'untested') as McpTestStatus,
    testError: row.test_error,
    testedAt: row.tested_at,
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

  const appliedMcps = db
    .prepare(
      `SELECT pra.resource_id, pra.agent_id, pra.applied_config_hash,
              m.config_hash, a.name as agent_name
       FROM resource_agent pra
       JOIN mcp m ON m.id = pra.resource_id
       JOIN agent a ON a.id = pra.agent_id
       WHERE pra.resource_type = 'mcp'`,
    )
    .all() as {
    resource_id: string;
    agent_id: string;
    applied_config_hash: string | null;
    config_hash: string | null;
    agent_name: string;
  }[];

  const appliedMap = new Map<string, { agents: string[]; outOfSync: boolean }>();
  for (const applied of appliedMcps) {
    const existing = appliedMap.get(applied.resource_id);
    const isOutOfSync = !!(applied.applied_config_hash && applied.config_hash && applied.applied_config_hash !== applied.config_hash);

    if (existing) {
      existing.agents.push(applied.agent_name);
      if (isOutOfSync) existing.outOfSync = true;
    } else {
      appliedMap.set(applied.resource_id, {
        agents: [applied.agent_name],
        outOfSync: isOutOfSync,
      });
    }
  }

  return rows.map((row) => {
    const mcp = rowToMcp(row, getTagsForMcp(db, row.id));
    const applied = appliedMap.get(row.id);
    return {
      ...mcp,
      applied: applied ? { agents: applied.agents, outOfSync: applied.outOfSync } : null,
    };
  });
}

export function getMcp(db: Database.Database, id: string): McpServer | null {
  const row = db.prepare('SELECT * FROM mcp WHERE id = ?').get(id) as McpRow | undefined;
  return row ? rowToMcp(row, getTagsForMcp(db, row.id)) : null;
}

export function createMcp(db: Database.Database, input: CreateMcpInput): McpServer {
  const conflicting = db.prepare('SELECT id FROM mcp WHERE name = ?').get(input.name) as
    | { id: string }
    | undefined;
  if (conflicting) {
    throw new Error(`An MCP server named "${input.name}" already exists.`);
  }

  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();
  const argsJson = input.args ? JSON.stringify(input.args) : null;
  const envJson = input.env ? JSON.stringify(input.env) : null;
  const configHash = computeConfigHash({
    transport: input.transport ?? null,
    command: input.command ?? null,
    url: input.url ?? null,
    argsJson,
    envJson,
  });

  db.prepare(
    `INSERT INTO mcp (id, name, transport, command, url, args_json, env_json, description, test_status, config_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'untested', ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.transport ?? null,
    input.command ?? null,
    input.url ?? null,
    argsJson,
    envJson,
    input.description ?? null,
    configHash,
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

  if (input.name !== undefined && input.name !== existing.name) {
    const conflicting = db.prepare('SELECT id FROM mcp WHERE name = ? AND id != ?').get(
      input.name,
      id,
    ) as { id: string } | undefined;
    if (conflicting) {
      throw new Error(`An MCP server named "${input.name}" already exists.`);
    }
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  const newTransport = input.transport !== undefined ? input.transport : existing.transport;
  const newCommand = input.command !== undefined ? input.command : existing.command;
  const newUrl = input.url !== undefined ? input.url : existing.url;
  const newArgsJson = input.args !== undefined ? JSON.stringify(input.args) : (existing.args.length > 0 ? JSON.stringify(existing.args) : null);
  const newEnvJson = input.env !== undefined ? JSON.stringify(input.env) : (Object.keys(existing.env).length > 0 ? JSON.stringify(existing.env) : null);

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
    values.push(newArgsJson);
  }
  if (input.env !== undefined) {
    fields.push('env_json = ?');
    values.push(newEnvJson);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description);
  }

  if (fields.length === 0) return existing;

  const newHash = computeConfigHash({
    transport: newTransport,
    command: newCommand,
    url: newUrl,
    argsJson: newArgsJson,
    envJson: newEnvJson,
  });

  // Read current config_hash from DB row directly
  const row = db.prepare('SELECT config_hash, test_status FROM mcp WHERE id = ?').get(id) as { config_hash: string | null; test_status: string } | undefined;
  if (row && row.config_hash && row.config_hash !== newHash && (row.test_status === 'passed' || row.test_status === 'failed')) {
    fields.push('test_status = ?');
    values.push('config_changed');
  }
  fields.push('config_hash = ?');
  values.push(newHash);

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
  db.prepare('DELETE FROM mcp_test_result WHERE mcp_id = ?').run(id);
  db.prepare('DELETE FROM mcp_tool WHERE mcp_id = ?').run(id);
  db.prepare('DELETE FROM mcp_prompt WHERE mcp_id = ?').run(id);
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

// Test result CRUD

export function saveTestResult(db: Database.Database, result: McpTestResult): void {
  db.prepare(
    `INSERT OR REPLACE INTO mcp_test_result (mcp_id, status, error_message, tools_count, prompts_count, tested_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(result.mcpId, result.status, result.errorMessage, result.toolsCount, result.promptsCount, result.testedAt);

  db.prepare(
    'UPDATE mcp SET test_status = ?, test_error = ?, tested_at = ? WHERE id = ?',
  ).run(result.status, result.errorMessage, result.testedAt, result.mcpId);
}

export function getTestResult(db: Database.Database, mcpId: string): McpTestResult | null {
  const row = db.prepare('SELECT * FROM mcp_test_result WHERE mcp_id = ?').get(mcpId) as {
    mcp_id: string;
    status: string;
    error_message: string | null;
    tools_count: number;
    prompts_count: number;
    tested_at: string;
  } | undefined;
  if (!row) return null;
  return {
    mcpId: row.mcp_id,
    status: row.status as 'passed' | 'failed',
    errorMessage: row.error_message,
    toolsCount: row.tools_count,
    promptsCount: row.prompts_count,
    testedAt: row.tested_at,
  };
}

export function saveTools(db: Database.Database, mcpId: string, tools: McpTool[]): void {
  db.prepare('DELETE FROM mcp_tool WHERE mcp_id = ?').run(mcpId);
  for (const tool of tools) {
    db.prepare(
      'INSERT INTO mcp_tool (id, mcp_id, name, description, input_schema) VALUES (?, ?, ?, ?, ?)',
    ).run(tool.id, tool.mcpId, tool.name, tool.description, tool.inputSchema);
  }
}

export function getTools(db: Database.Database, mcpId: string): McpTool[] {
  const rows = db.prepare('SELECT * FROM mcp_tool WHERE mcp_id = ? ORDER BY name').all(mcpId) as Array<{
    id: string;
    mcp_id: string;
    name: string;
    description: string | null;
    input_schema: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    mcpId: r.mcp_id,
    name: r.name,
    description: r.description,
    inputSchema: r.input_schema,
  }));
}

export function savePrompts(db: Database.Database, mcpId: string, prompts: McpPrompt[]): void {
  db.prepare('DELETE FROM mcp_prompt WHERE mcp_id = ?').run(mcpId);
  for (const prompt of prompts) {
    db.prepare(
      'INSERT INTO mcp_prompt (id, mcp_id, name, description) VALUES (?, ?, ?, ?)',
    ).run(prompt.id, prompt.mcpId, prompt.name, prompt.description);
  }
}

export function getPrompts(db: Database.Database, mcpId: string): McpPrompt[] {
  const rows = db.prepare('SELECT * FROM mcp_prompt WHERE mcp_id = ? ORDER BY name').all(mcpId) as Array<{
    id: string;
    mcp_id: string;
    name: string;
    description: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    mcpId: r.mcp_id,
    name: r.name,
    description: r.description,
  }));
}
