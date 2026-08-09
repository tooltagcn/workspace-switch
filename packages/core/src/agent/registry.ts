import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Agent, CreateAgentInput, UpdateAgentInput } from './types.js';

interface AgentRow {
  id: string;
  name: string;
  builtin: number;
  config_dir_name: string;
  user_root: string | null;
  project_root: string | null;
  project_enabled: number;
  mcp_file: string | null;
  mcp_field: string | null;
  skill_dir: string | null;
  enabled: number;
  detected_at: string | null;
  template_id: string | null;
  mcp_config_path: string | null;
  target_format: string | null;
  env_transform: string | null;
  field_mapping_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    builtin: row.builtin === 1,
    configDirName: row.config_dir_name,
    userRoot: row.user_root,
    projectRoot: row.project_root,
    projectEnabled: row.project_enabled === 1,
    mcpFile: row.mcp_file,
    mcpField: row.mcp_field,
    skillDir: row.skill_dir,
    enabled: row.enabled === 1,
    detectedAt: row.detected_at,
    templateId: row.template_id,
    mcpConfigPath: row.mcp_config_path,
    targetFormat: row.target_format,
    envTransform: row.env_transform,
    fieldMapping: row.field_mapping_json ? JSON.parse(row.field_mapping_json) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listAgents(db: Database.Database): Agent[] {
  const rows = db.prepare('SELECT * FROM agent WHERE enabled = 1 ORDER BY name').all() as AgentRow[];
  return rows.map(rowToAgent);
}

export function listAllAgents(db: Database.Database): Agent[] {
  const rows = db.prepare('SELECT * FROM agent ORDER BY name').all() as AgentRow[];
  return rows.map(rowToAgent);
}

export function getAgent(db: Database.Database, id: string): Agent | null {
  const row = db.prepare('SELECT * FROM agent WHERE id = ?').get(id) as AgentRow | undefined;
  return row ? rowToAgent(row) : null;
}

export function createAgent(db: Database.Database, input: CreateAgentInput): Agent {
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();
  const builtin = input.builtin ? 1 : 0;
  const enabled = input.enabled !== false ? 1 : 0;
  const projectEnabled = input.projectEnabled ? 1 : 0;

  db.prepare(
    `INSERT INTO agent (id, name, builtin, config_dir_name, user_root, project_root, project_enabled, mcp_file, mcp_field, skill_dir, enabled, detected_at, template_id, mcp_config_path, target_format, env_transform, field_mapping_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    builtin,
    input.configDirName,
    input.userRoot ?? null,
    input.projectRoot ?? null,
    projectEnabled,
    input.mcpFile ?? null,
    input.mcpField ?? null,
    input.skillDir ?? null,
    enabled,
    input.detectedAt ?? null,
    input.templateId ?? null,
    input.mcpConfigPath ?? null,
    input.targetFormat ?? null,
    input.envTransform ?? null,
    input.fieldMapping ? JSON.stringify(input.fieldMapping) : null,
    now,
    now,
  );

  return getAgent(db, id)!;
}

export function updateAgent(
  db: Database.Database,
  id: string,
  input: UpdateAgentInput,
): Agent | null {
  const existing = getAgent(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.configDirName !== undefined) {
    fields.push('config_dir_name = ?');
    values.push(input.configDirName);
  }
  if (input.userRoot !== undefined) {
    fields.push('user_root = ?');
    values.push(input.userRoot);
  }
  if (input.projectRoot !== undefined) {
    fields.push('project_root = ?');
    values.push(input.projectRoot);
  }
  if (input.projectEnabled !== undefined) {
    fields.push('project_enabled = ?');
    values.push(input.projectEnabled ? 1 : 0);
  }
  if (input.mcpFile !== undefined) {
    fields.push('mcp_file = ?');
    values.push(input.mcpFile);
  }
  if (input.mcpField !== undefined) {
    fields.push('mcp_field = ?');
    values.push(input.mcpField);
  }
  if (input.skillDir !== undefined) {
    fields.push('skill_dir = ?');
    values.push(input.skillDir);
  }
  if (input.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(input.enabled ? 1 : 0);
  }
  if (input.detectedAt !== undefined) {
    fields.push('detected_at = ?');
    values.push(input.detectedAt);
  }
  if (input.templateId !== undefined) {
    fields.push('template_id = ?');
    values.push(input.templateId);
  }
  if (input.mcpConfigPath !== undefined) {
    fields.push('mcp_config_path = ?');
    values.push(input.mcpConfigPath);
  }
  if (input.targetFormat !== undefined) {
    fields.push('target_format = ?');
    values.push(input.targetFormat);
  }
  if (input.envTransform !== undefined) {
    fields.push('env_transform = ?');
    values.push(input.envTransform);
  }
  if (input.fieldMapping !== undefined) {
    fields.push('field_mapping_json = ?');
    values.push(input.fieldMapping ? JSON.stringify(input.fieldMapping) : null);
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE agent SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getAgent(db, id)!;
}

export function deleteAgent(db: Database.Database, id: string): boolean {
  const agent = getAgent(db, id);
  if (!agent) return false;
  if (agent.builtin) {
    throw new Error(`Cannot delete builtin agent "${agent.name}"`);
  }
  db.prepare('DELETE FROM agent WHERE id = ?').run(id);
  return true;
}
