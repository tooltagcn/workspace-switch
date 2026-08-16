import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Agent } from '../agent/types.js';
import type { WsMcpSchema } from '../mcp/schema.js';
import type { ScannedSkill, ScannedMcp, ScanClassification } from './types.js';

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const fields: Record<string, string> = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (rawValue === '>-' || rawValue === '>') {
      // Folded block scalar: join lines with spaces
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].startsWith('\t'))) {
        const trimmed = lines[i].trim();
        if (trimmed) blockLines.push(trimmed);
        i++;
      }
      if (key) fields[key] = blockLines.join(' ');
      continue;
    }

    if (rawValue === '|' || rawValue === '|-' || rawValue === '|+') {
      // Literal block scalar: preserve newlines
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].startsWith('\t'))) {
        blockLines.push(lines[i].replace(/^ {2}/, ''));
        i++;
      }
      if (key) fields[key] = blockLines.join('\n').replace(/\n+$/, '');
      continue;
    }

    let value = rawValue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) fields[key] = value;
    i++;
  }

  return fields;
}

function classifySkill(
  db: Database.Database,
  name: string,
  sourcePath: string,
): ScanClassification {
  const row = db
    .prepare('SELECT source_path FROM skill WHERE name = ?')
    .get(name) as { source_path: string | null } | undefined;

  if (!row) return 'new';
  if (row.source_path === sourcePath) return 'synced';
  return 'conflict';
}

function classifyMcp(
  db: Database.Database,
  name: string,
  schema: WsMcpSchema,
): ScanClassification {
  const row = db
    .prepare(
      `SELECT transport, command, url, args_json, env_json, description
       FROM mcp WHERE name = ?`,
    )
    .get(name) as {
    transport: string | null;
    command: string | null;
    url: string | null;
    args_json: string | null;
    env_json: string | null;
    description: string | null;
  } | undefined;

  if (!row) return 'new';

  const dbSchema: WsMcpSchema = {
    name,
    transport: (row.transport as WsMcpSchema['transport']) ?? 'stdio',
  };
  if (row.command) dbSchema.command = row.command;
  if (row.url) dbSchema.url = row.url;
  if (row.args_json) dbSchema.args = JSON.parse(row.args_json);
  if (row.env_json) dbSchema.env = JSON.parse(row.env_json);
  if (row.description) dbSchema.description = row.description;

  if (JSON.stringify(schema) === JSON.stringify(dbSchema)) return 'synced';
  return 'conflict';
}

export function scanSkillsFromAgents(
  db: Database.Database,
  agents: Agent[],
): ScannedSkill[] {
  const results: ScannedSkill[] = [];

  for (const agent of agents) {
    if (!agent.enabled || !agent.skillDir || !agent.userRoot) continue;

    const skillDir = path.join(agent.userRoot, agent.skillDir);
    if (!fs.existsSync(skillDir)) continue;

    const entries = fs.readdirSync(skillDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(skillDir, entry.name);

      if (fs.lstatSync(fullPath).isSymbolicLink()) continue;

      const skillMdPath = path.join(fullPath, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const name = frontmatter.name;
      if (!name) continue;

      const classification = classifySkill(db, name, fullPath);

      results.push({
        name,
        agentId: agent.id,
        agentName: agent.name,
        sourcePath: fullPath,
        classification,
        description: frontmatter.description ?? null,
      });
    }
  }

  return results;
}

function parseJsonMcpFile(filePath: string, mcpField: string): WsMcpSchema[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const section = parsed[mcpField] as Record<string, Record<string, unknown>> | undefined;
  if (!section || typeof section !== 'object') return [];

  const results: WsMcpSchema[] = [];
  for (const [name, config] of Object.entries(section)) {
    if (!config || typeof config !== 'object') continue;
    const schema = jsonEntryToSchema(name, config);
    if (schema) results.push(schema);
  }
  return results;
}

function jsonEntryToSchema(
  name: string,
  config: Record<string, unknown>,
): WsMcpSchema | null {
  if (config.command) {
    const schema: WsMcpSchema = {
      name,
      transport: 'stdio',
      command: config.command as string,
    };
    if (Array.isArray(config.args)) {
      schema.args = config.args as string[];
    }
    if (config.env && typeof config.env === 'object') {
      schema.env = config.env as Record<string, string>;
    }
    return schema;
  }

  if (config.url) {
    const schema: WsMcpSchema = {
      name,
      transport: 'sse',
      url: config.url as string,
    };
    if (config.env && typeof config.env === 'object') {
      schema.env = config.env as Record<string, string>;
    }
    return schema;
  }

  return null;
}

function parseTomlMcpFile(filePath: string, mcpField: string): WsMcpSchema[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseTomlMcpSection(content, mcpField);
}

function parseTomlMcpSection(content: string, mcpField: string): WsMcpSchema[] {
  const results: WsMcpSchema[] = [];
  const sectionPattern = new RegExp(
    `^\\[${escapeRegex(mcpField)}\\.([^\\]]+)\\]`,
    'm',
  );

  const lines = content.split('\n');
  let currentName: string | null = null;
  let currentConfig: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(sectionPattern);
    if (match) {
      if (currentName) {
        const schema = tomlEntryToSchema(currentName, currentConfig);
        if (schema) results.push(schema);
      }
      currentName = match[1].trim();
      currentConfig = {};
      continue;
    }

    if (currentName && trimmed.startsWith('[') && !trimmed.startsWith('[' + mcpField)) {
      const schema = tomlEntryToSchema(currentName, currentConfig);
      if (schema) results.push(schema);
      currentName = null;
      currentConfig = {};
      continue;
    }

    if (!currentName) continue;
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const rawValue = trimmed.slice(eqIdx + 1).trim();
    currentConfig[key] = parseTomlValue(rawValue);
  }

  if (currentName) {
    const schema = tomlEntryToSchema(currentName, currentConfig);
    if (schema) results.push(schema);
  }

  return results;
}

function parseTomlValue(raw: string): unknown {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }
  if (raw.startsWith('[')) {
    try {
      const inner = raw.slice(1, raw.lastIndexOf(']'));
      return inner.split(',').map((s) => {
        const t = s.trim();
        if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
        return t;
      });
    } catch {
      return [];
    }
  }
  if (raw.startsWith('{')) {
    try {
      const inner = raw.slice(1, raw.lastIndexOf('}'));
      const obj: Record<string, string> = {};
      for (const pair of inner.split(',')) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) continue;
        let k = pair.slice(0, eqIdx).trim();
        if (k.startsWith('"') && k.endsWith('"')) k = k.slice(1, -1);
        let v = pair.slice(eqIdx + 1).trim();
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        obj[k] = v;
      }
      return obj;
    } catch {
      return {};
    }
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const num = Number(raw);
  if (!Number.isNaN(num)) return num;
  return raw;
}

function tomlEntryToSchema(
  name: string,
  config: Record<string, unknown>,
): WsMcpSchema | null {
  if (config.command) {
    const schema: WsMcpSchema = {
      name,
      transport: 'stdio',
      command: config.command as string,
    };
    if (Array.isArray(config.args)) {
      schema.args = config.args as string[];
    }
    if (config.env && typeof config.env === 'object' && !Array.isArray(config.env)) {
      schema.env = config.env as Record<string, string>;
    }
    return schema;
  }

  if (config.url) {
    const schema: WsMcpSchema = {
      name,
      transport: 'sse',
      url: config.url as string,
    };
    if (config.env && typeof config.env === 'object' && !Array.isArray(config.env)) {
      schema.env = config.env as Record<string, string>;
    }
    return schema;
  }

  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scanMcpsFromAgents(
  db: Database.Database,
  agents: Agent[],
): ScannedMcp[] {
  const results: ScannedMcp[] = [];

  for (const agent of agents) {
    if (!agent.enabled || !agent.mcpFile || !agent.userRoot) continue;

    const filePath = path.join(agent.userRoot, agent.mcpFile);
    if (!fs.existsSync(filePath)) continue;

    let schemas: WsMcpSchema[];
    if (agent.mcpFile.endsWith('.toml')) {
      schemas = parseTomlMcpFile(filePath, agent.mcpField ?? 'mcpServers');
    } else {
      schemas = parseJsonMcpFile(filePath, agent.mcpField ?? 'mcpServers');
    }

    for (const schema of schemas) {
      const classification = classifyMcp(db, schema.name, schema);
      results.push({
        name: schema.name,
        agentId: agent.id,
        agentName: agent.name,
        sourcePath: filePath,
        classification,
        schema,
      });
    }
  }

  return results;
}
