import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Agent } from '../agent/types.js';
import type { AgentTemplate } from '../agent/template-types.js';
import type { SymlinkPlatform } from './platform.js';
import { loadMcpFromWorkspace } from '../mcp/storage.js';
import { parseConfigFile, serializeConfigFile, buildMcpEntry } from '../mcp/renderer.js';
import type { SecretStore } from '../mcp/types.js';

export interface SyncResult {
  name: string;
  type: 'skill' | 'mcp';
  success: boolean;
  error: string | null;
}

export interface SyncAgentAllResult {
  agentId: string;
  results: SyncResult[];
  succeeded: number;
  failed: number;
}

export function syncSkillToWorkspace(
  db: Database.Database,
  agent: Agent,
  skillName: string,
  workspaceDir: string,
  symlink: SymlinkPlatform,
): SyncResult {
  if (!agent.skillDir || !agent.userRoot) {
    return { name: skillName, type: 'skill', success: false, error: 'Agent has no skill directory configured' };
  }

  const trustedSource = path.join(workspaceDir, 'skills', skillName);
  if (!fs.existsSync(trustedSource)) {
    return { name: skillName, type: 'skill', success: false, error: `Trusted source not found: ${trustedSource}` };
  }

  const agentLocalPath = path.join(agent.userRoot, agent.skillDir, skillName);

  try {
    if (fs.existsSync(agentLocalPath)) {
      const stat = fs.lstatSync(agentLocalPath);
      if (stat.isSymbolicLink()) {
        symlink.removeSymlink(agentLocalPath);
      } else if (stat.isDirectory()) {
        fs.rmSync(agentLocalPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(agentLocalPath);
      }
    }

    fs.mkdirSync(path.dirname(agentLocalPath), { recursive: true });
    symlink.createSymlink(trustedSource, agentLocalPath);

    const now = new Date().toISOString();
    const existing = db
      .prepare(
        `SELECT 1 FROM resource_agent
         WHERE resource_type = 'skill' AND agent_id = ? AND resource_id = (SELECT id FROM skill WHERE name = ?)`,
      )
      .get(agent.id, skillName);

    if (existing) {
      db.prepare(
        `UPDATE resource_agent SET symlinked = 1, applied_at = ?
         WHERE resource_type = 'skill' AND agent_id = ? AND resource_id = (SELECT id FROM skill WHERE name = ?)`,
      ).run(now, agent.id, skillName);
    } else {
      db.prepare(
        `INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked, applied_at)
         VALUES ('skill', (SELECT id FROM skill WHERE name = ?), ?, 1, ?)`,
      ).run(skillName, agent.id, now);
    }

    return { name: skillName, type: 'skill', success: true, error: null };
  } catch (err) {
    return { name: skillName, type: 'skill', success: false, error: String(err) };
  }
}

export function unsyncSkillFromWorkspace(
  db: Database.Database,
  agent: Agent,
  skillName: string,
  symlink: SymlinkPlatform,
): SyncResult {
  if (!agent.skillDir || !agent.userRoot) {
    return { name: skillName, type: 'skill', success: false, error: 'Agent has no skill directory configured' };
  }

  const agentLocalPath = path.join(agent.userRoot, agent.skillDir, skillName);

  try {
    if (fs.existsSync(agentLocalPath)) {
      const stat = fs.lstatSync(agentLocalPath);
      if (stat.isSymbolicLink()) {
        symlink.removeSymlink(agentLocalPath);
      } else if (stat.isDirectory()) {
        fs.rmSync(agentLocalPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(agentLocalPath);
      }
    }

    db.prepare(
      `DELETE FROM resource_agent
       WHERE resource_type = 'skill' AND agent_id = ? AND resource_id = (SELECT id FROM skill WHERE name = ?)`,
    ).run(agent.id, skillName);

    return { name: skillName, type: 'skill', success: true, error: null };
  } catch (err) {
    return { name: skillName, type: 'skill', success: false, error: String(err) };
  }
}

export async function syncMcpToWorkspace(
  db: Database.Database,
  agent: Agent,
  template: AgentTemplate,
  mcpName: string,
  workspaceDir: string,
  secretStore?: SecretStore,
): Promise<SyncResult> {
  if (!template.mcpFile || !template.mcpField || !agent.userRoot) {
    return { name: mcpName, type: 'mcp', success: false, error: 'Agent does not support MCP' };
  }

  const trustedSchema = loadMcpFromWorkspace(workspaceDir, mcpName);
  if (!trustedSchema) {
    return { name: mcpName, type: 'mcp', success: false, error: `Trusted MCP source not found: ${mcpName}` };
  }

  const agentConfigPath = path.join(agent.userRoot, template.mcpFile);

  try {
    let existing: Record<string, unknown> = {};
    const before = fs.existsSync(agentConfigPath) ? fs.readFileSync(agentConfigPath, 'utf-8') : null;
    if (before) {
      existing = parseConfigFile(before, template);
    }

    const schemaWithSecrets = { ...trustedSchema };
    if (trustedSchema.env) {
      schemaWithSecrets.env = { ...trustedSchema.env };
      if (secretStore) {
        for (const [key, value] of Object.entries(schemaWithSecrets.env)) {
          if (typeof value === 'string' && value.startsWith('env:')) {
            const varName = value.slice(4);
            const resolved = await secretStore.getSecret(mcpName, varName);
            if (resolved !== null) {
              schemaWithSecrets.env[key] = resolved;
            }
          }
        }
      }
    }

    const field = template.mcpField;
    const existingSection = (existing[field] as Record<string, unknown>) ?? {};
    const merged = { ...existingSection, [mcpName]: buildMcpEntry(schemaWithSecrets) };
    const afterObj = { ...existing, [field]: merged };
    const after = serializeConfigFile(afterObj, template);

    const dir = path.dirname(agentConfigPath);
    const tmpPath = path.join(dir, `.${randomUUID()}.tmp`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(tmpPath, after, 'utf-8');
      fs.renameSync(tmpPath, agentConfigPath);
    } catch (err) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup failure
      }
      if (before !== null) {
        try {
          fs.writeFileSync(agentConfigPath, before, 'utf-8');
        } catch {
          // best-effort rollback
        }
      }
      throw err;
    }

    const mcpRow = db.prepare('SELECT id, config_hash FROM mcp WHERE name = ?').get(mcpName) as { id: string; config_hash: string | null } | undefined;
    if (!mcpRow) {
      return { name: mcpName, type: 'mcp', success: false, error: `MCP not found in database: ${mcpName}` };
    }

    const now = new Date().toISOString();
    const existingRecord = db
      .prepare(
        `SELECT 1 FROM resource_agent
         WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
      )
      .get(mcpRow.id, agent.id);

    if (existingRecord) {
      db.prepare(
        `UPDATE resource_agent SET target_path = ?, applied_config_hash = ?, applied_at = ?
         WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
      ).run(agentConfigPath, mcpRow.config_hash, now, mcpRow.id, agent.id);
    } else {
      db.prepare(
        `INSERT INTO resource_agent (resource_type, resource_id, agent_id, target_path, symlinked, applied_config_hash, applied_at)
         VALUES ('mcp', ?, ?, ?, 0, ?, ?)`,
      ).run(mcpRow.id, agent.id, agentConfigPath, mcpRow.config_hash, now);
    }

    return { name: mcpName, type: 'mcp', success: true, error: null };
  } catch (err) {
    return { name: mcpName, type: 'mcp', success: false, error: String(err) };
  }
}

export async function syncAgentAll(
  db: Database.Database,
  agent: Agent,
  template: AgentTemplate,
  workspaceDir: string,
  symlink: SymlinkPlatform,
  secretStore?: SecretStore,
): Promise<SyncAgentAllResult> {
  const results: SyncResult[] = [];

  const skillRows = db
    .prepare(
      `SELECT s.name FROM skill s
       JOIN resource_agent ra ON ra.resource_type = 'skill' AND ra.resource_id = s.id
       WHERE ra.agent_id = ?`,
    )
    .all(agent.id) as Array<{ name: string }>;

  for (const row of skillRows) {
    const result = syncSkillToWorkspace(db, agent, row.name, workspaceDir, symlink);
    results.push(result);
  }

  const mcpRows = db
    .prepare(
      `SELECT m.name FROM mcp m
       JOIN resource_agent ra ON ra.resource_type = 'mcp' AND ra.resource_id = m.id
       WHERE ra.agent_id = ?`,
    )
    .all(agent.id) as Array<{ name: string }>;

  for (const row of mcpRows) {
    const result = await syncMcpToWorkspace(db, agent, template, row.name, workspaceDir, secretStore);
    results.push(result);
  }

  return {
    agentId: agent.id,
    results,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}

export function unsyncMcpFromWorkspace(
  db: Database.Database,
  agent: Agent,
  template: AgentTemplate,
  mcpName: string,
): SyncResult {
  if (!template.mcpFile || !template.mcpField || !agent.userRoot) {
    return { name: mcpName, type: 'mcp', success: false, error: 'Agent does not support MCP' };
  }

  const agentConfigPath = path.join(agent.userRoot, template.mcpFile);

  try {
    const mcpRow = db.prepare('SELECT id FROM mcp WHERE name = ?').get(mcpName) as { id: string } | undefined;
    if (!mcpRow) {
      return { name: mcpName, type: 'mcp', success: false, error: `MCP not found in database: ${mcpName}` };
    }

    const existingRecord = db
      .prepare(
        `SELECT 1 FROM resource_agent
         WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
      )
      .get(mcpRow.id, agent.id);

    if (!existingRecord) {
      return { name: mcpName, type: 'mcp', success: false, error: `MCP '${mcpName}' is not applied to agent '${agent.id}'` };
    }

    if (!fs.existsSync(agentConfigPath)) {
      db.prepare(
        `DELETE FROM resource_agent
         WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
      ).run(mcpRow.id, agent.id);
      return { name: mcpName, type: 'mcp', success: true, error: null };
    }

    const before = fs.readFileSync(agentConfigPath, 'utf-8');
    let existing: Record<string, unknown> = {};
    try {
      existing = parseConfigFile(before, template);
    } catch {
      existing = {};
    }

    const field = template.mcpField;
    const existingSection = (existing[field] as Record<string, unknown>) ?? {};
    delete existingSection[mcpName];
    const afterObj = { ...existing, [field]: existingSection };
    const after = serializeConfigFile(afterObj, template);

    const dir = path.dirname(agentConfigPath);
    const tmpPath = path.join(dir, `.${randomUUID()}.tmp`);
    try {
      fs.writeFileSync(tmpPath, after, 'utf-8');
      fs.renameSync(tmpPath, agentConfigPath);
    } catch (err) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup failure
      }
      try {
        fs.writeFileSync(agentConfigPath, before, 'utf-8');
      } catch {
        // best-effort rollback
      }
      throw err;
    }

    db.prepare(
      `DELETE FROM resource_agent
       WHERE resource_type = 'mcp' AND resource_id = ? AND agent_id = ?`,
    ).run(mcpRow.id, agent.id);

    return { name: mcpName, type: 'mcp', success: true, error: null };
  } catch (err) {
    return { name: mcpName, type: 'mcp', success: false, error: String(err) };
  }
}

export function unsyncAllMcpsFromAgent(
  db: Database.Database,
  agent: Agent,
  template: AgentTemplate,
): SyncAgentAllResult {
  const results: SyncResult[] = [];

  const mcpRows = db
    .prepare(
      `SELECT m.name FROM mcp m
       JOIN resource_agent ra ON ra.resource_type = 'mcp' AND ra.resource_id = m.id
       WHERE ra.agent_id = ?`,
    )
    .all(agent.id) as Array<{ name: string }>;

  for (const row of mcpRows) {
    const result = unsyncMcpFromWorkspace(db, agent, template, row.name);
    results.push(result);
  }

  return {
    agentId: agent.id,
    results,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}

export interface AppliedAgent {
  agentId: string;
  agentName: string;
  appliedAt: string;
}

export function getAppliedAgentsForResource(
  db: Database.Database,
  resourceType: 'skill' | 'mcp',
  resourceId: string,
): AppliedAgent[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.name, ra.applied_at
       FROM resource_agent ra
       JOIN agent a ON a.id = ra.agent_id
       WHERE ra.resource_type = ? AND ra.resource_id = ?
       ORDER BY a.name`,
    )
    .all(resourceType, resourceId) as Array<{ id: string; name: string; applied_at: string }>;

  return rows.map((r) => ({
    agentId: r.id,
    agentName: r.name,
    appliedAt: r.applied_at,
  }));
}

export function getAppliedAgentsForSkill(
  db: Database.Database,
  skillId: string,
): AppliedAgent[] {
  return getAppliedAgentsForResource(db, 'skill', skillId);
}

export function getAppliedAgentsForMcp(
  db: Database.Database,
  mcpId: string,
): AppliedAgent[] {
  return getAppliedAgentsForResource(db, 'mcp', mcpId);
}
