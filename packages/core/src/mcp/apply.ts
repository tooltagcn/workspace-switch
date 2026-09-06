import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AgentTemplate } from '../agent/template-types.js';
import type { McpServer } from './types.js';
import { parseConfigFile, serializeConfigFile, buildMcpEntry } from './renderer.js';
import { mutateConfig } from './mutation.js';
import { resolveMcpConfigPath } from '../agent/expand-paths.js';
import type { WsMcpSchema } from './schema.js';

export type ApplyMode = 'merge' | 'strict';

export interface ApplyMcpOptions {
  agentId: string;
  agentConfigDir: string;
  template: AgentTemplate;
  mcps: McpServer[];
  mode: ApplyMode;
  mcpConfigPath?: string | null;
}

export interface ApplyMcpResult {
  filePath: string;
  before: string | null;
  after: string;
}

function mcpServerToSchema(server: McpServer): WsMcpSchema {
  const schema: WsMcpSchema = {
    name: server.name,
    transport: server.transport ?? 'stdio',
  };
  if (server.command) schema.command = server.command;
  if (server.url) schema.url = server.url;
  if (server.args.length > 0) schema.args = server.args;
  if (Object.keys(server.env).length > 0) schema.env = server.env;
  if (server.description) schema.description = server.description;
  return schema;
}

function applyMcpsToConfig(
  existing: Record<string, unknown>,
  template: AgentTemplate,
  mcps: McpServer[],
  mode: ApplyMode,
): Record<string, unknown> {
  const field = template.mcpField!;
  let result = mode === 'strict' ? { ...existing, [field]: {} } : { ...existing };

  for (const mcp of mcps) {
    const entry = buildMcpEntry(mcpServerToSchema(mcp), template.entryFormat);
    result = mutateConfig(result, field, { type: 'add', name: mcp.name, entry });
  }
  return result;
}

function atomicWrite(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.${randomUUID()}.tmp`);

  try {
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup failure
    }
    throw err;
  }
}

export function applyMcpToAgent(
  db: Database.Database,
  options: ApplyMcpOptions,
): ApplyMcpResult {
  const { agentId, agentConfigDir, template, mcps, mode, mcpConfigPath } = options;

  if (!template.mcpFile || !template.mcpField) {
    throw new Error(`Agent template "${template.id}" does not support MCP`);
  }

  const filePath = resolveMcpConfigPath({ mcpConfigPath: mcpConfigPath ?? null, userRoot: agentConfigDir }, template);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const before = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  let existing: Record<string, unknown> = {};
  if (before) {
    existing = parseConfigFile(before, template);
  }

  const afterObj = applyMcpsToConfig(existing, template, mcps, mode);
  const after = serializeConfigFile(afterObj, template);

  const now = new Date().toISOString();

  try {
    const updateDb = db.transaction(() => {
      for (const mcp of mcps) {
        const mcpRow = db
          .prepare('SELECT config_hash FROM mcp WHERE id = ?')
          .get(mcp.id) as { config_hash: string | null } | undefined;

        const existingResource = db
          .prepare(
            `SELECT 1 FROM resource_agent WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
          )
          .get(mcp.id, agentId);

        if (existingResource) {
          db.prepare(
            `UPDATE resource_agent SET target_path = ?, applied_config_hash = ?, applied_at = ?
             WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
          ).run(filePath, mcpRow?.config_hash ?? null, now, mcp.id, agentId);
        } else {
          db.prepare(
            `INSERT INTO resource_agent (resource_type, resource_id, agent_id, target_path, symlinked, applied_config_hash, applied_at)
             VALUES ('mcp', ?, ?, ?, 0, ?, ?)`,
          ).run(mcp.id, agentId, filePath, mcpRow?.config_hash ?? null, now);
        }
      }
    });

    updateDb();
    atomicWrite(filePath, after);
  } catch (err) {
    if (before !== null) {
      try {
        atomicWrite(filePath, before);
      } catch {
        // best-effort rollback
      }
    }
    throw err;
  }

  return { filePath, before, after };
}

export interface PreviewMcpResult {
  filePath: string;
  before: string | null;
  after: string;
  diff: string;
}

export function previewMcpApply(
  options: Omit<ApplyMcpOptions, 'mode' | 'agentId'> & { mode?: ApplyMode },
): PreviewMcpResult {
  const { agentConfigDir, template, mcps, mode = 'merge', mcpConfigPath } = options;

  if (!template.mcpFile || !template.mcpField) {
    throw new Error(`Agent template "${template.id}" does not support MCP`);
  }

  const filePath = resolveMcpConfigPath({ mcpConfigPath: mcpConfigPath ?? null, userRoot: agentConfigDir }, template);
  const before = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  let existing: Record<string, unknown> = {};
  if (before) {
    existing = parseConfigFile(before, template);
  }

  const afterObj = applyMcpsToConfig(existing, template, mcps, mode);
  const after = serializeConfigFile(afterObj, template);
  const diff = unifiedDiff(filePath, before ?? '', after);

  return { filePath, before, after, diff };
}

function unifiedDiff(filePath: string, before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  const lines: string[] = [];
  lines.push(`--- ${filePath}`);
  lines.push(`+++ ${filePath}`);

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let i = 0;
  while (i < maxLen) {
    const bLine = i < beforeLines.length ? beforeLines[i] : undefined;
    const aLine = i < afterLines.length ? afterLines[i] : undefined;

    if (bLine === aLine) {
      lines.push(` ${bLine ?? ''}`);
    } else {
      if (bLine !== undefined) lines.push(`-${bLine}`);
      if (aLine !== undefined) lines.push(`+${aLine}`);
    }
    i++;
  }

  return lines.join('\n') + '\n';
}
