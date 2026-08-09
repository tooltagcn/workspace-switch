import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AgentTemplate } from '../agent/template-types.js';
import type { McpServer } from './types.js';
import { renderMcpForAgent } from './renderer.js';
import type { WsMcpSchema } from './schema.js';

export type ApplyMode = 'merge' | 'strict';

export interface ApplyMcpOptions {
  agentConfigDir: string;
  template: AgentTemplate;
  mcps: McpServer[];
  mode: ApplyMode;
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

function buildMcpSection(
  template: AgentTemplate,
  mcps: McpServer[],
): Record<string, unknown> {
  const section: Record<string, unknown> = {};
  for (const mcp of mcps) {
    const schema = mcpServerToSchema(mcp);
    const rendered = renderMcpForAgent(schema, template);
    const parsed = JSON.parse(rendered);
    const field = template.mcpField ?? 'mcpServers';
    const entries = parsed[field] as Record<string, unknown>;
    for (const [name, config] of Object.entries(entries)) {
      section[name] = config;
    }
  }
  return section;
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
  const { agentConfigDir, template, mcps, mode } = options;

  if (!template.mcpFile || !template.mcpField) {
    throw new Error(`Agent template "${template.id}" does not support MCP`);
  }

  const filePath = path.join(agentConfigDir, template.mcpFile);
  const before = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  let existing: Record<string, unknown> = {};
  if (before) {
    try {
      existing = JSON.parse(before);
    } catch {
      existing = {};
    }
  }

  const newSection = buildMcpSection(template, mcps);
  const field = template.mcpField;

  let afterObj: Record<string, unknown>;
  if (mode === 'strict') {
    afterObj = { ...existing, [field]: newSection };
  } else {
    const existingSection = (existing[field] as Record<string, unknown>) ?? {};
    afterObj = { ...existing, [field]: { ...existingSection, ...newSection } };
  }

  const after = JSON.stringify(afterObj, null, 2) + '\n';

  const beforeResourceRow = db
    .prepare(
      `SELECT * FROM resource_agent WHERE resource_type = 'mcp' AND agent_id = ? AND target_path = ?`,
    )
    .get(template.id, filePath) as Record<string, unknown> | undefined;

  try {
    const updateDb = db.transaction(() => {
      if (beforeResourceRow) {
        db.prepare(
          `UPDATE resource_agent SET applied_at = datetime('now') WHERE resource_type = 'mcp' AND agent_id = ? AND target_path = ?`,
        ).run(template.id, filePath);
      } else {
        db.prepare(
          `INSERT INTO resource_agent (resource_type, resource_id, agent_id, target_path) VALUES ('mcp', ?, ?, ?)`,
        ).run(mcps[0]?.id ?? 'unknown', template.id, filePath);
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
  options: Omit<ApplyMcpOptions, 'mode'> & { mode?: ApplyMode },
): PreviewMcpResult {
  const { agentConfigDir, template, mcps, mode = 'merge' } = options;

  if (!template.mcpFile || !template.mcpField) {
    throw new Error(`Agent template "${template.id}" does not support MCP`);
  }

  const filePath = path.join(agentConfigDir, template.mcpFile);
  const before = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  let existing: Record<string, unknown> = {};
  if (before) {
    try {
      existing = JSON.parse(before);
    } catch {
      existing = {};
    }
  }

  const newSection = buildMcpSection(template, mcps);
  const field = template.mcpField;

  let afterObj: Record<string, unknown>;
  if (mode === 'strict') {
    afterObj = { ...existing, [field]: newSection };
  } else {
    const existingSection = (existing[field] as Record<string, unknown>) ?? {};
    afterObj = { ...existing, [field]: { ...existingSection, ...newSection } };
  }

  const after = JSON.stringify(afterObj, null, 2) + '\n';
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
