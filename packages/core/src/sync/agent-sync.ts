import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Agent } from '../agent/types.js';
import type { AgentTemplate } from '../agent/template-types.js';
import type { SymlinkPlatform } from './platform.js';
import { loadMcpFromWorkspace } from '../mcp/storage.js';
import { renderMcpForAgent } from '../mcp/renderer.js';

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

export function syncMcpToWorkspace(
  db: Database.Database,
  agent: Agent,
  template: AgentTemplate,
  mcpName: string,
  workspaceDir: string,
): SyncResult {
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
    if (fs.existsSync(agentConfigPath)) {
      const content = fs.readFileSync(agentConfigPath, 'utf-8');
      try {
        existing = JSON.parse(content);
      } catch {
        existing = {};
      }
    }

    const rendered = renderMcpForAgent(trustedSchema, template);
    const parsed = JSON.parse(rendered);
    const field = template.mcpField;
    const newEntries = parsed[field] as Record<string, unknown>;

    const existingSection = (existing[field] as Record<string, unknown>) ?? {};
    const merged = { ...existingSection, ...newEntries };
    const afterObj = { ...existing, [field]: merged };
    const after = JSON.stringify(afterObj, null, 2) + '\n';

    fs.writeFileSync(agentConfigPath, after, 'utf-8');

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE resource_agent SET symlinked = 1, applied_at = ?
       WHERE resource_type = 'mcp' AND agent_id = ? AND resource_id = (SELECT id FROM mcp WHERE name = ?)`,
    ).run(now, agent.id, mcpName);

    return { name: mcpName, type: 'mcp', success: true, error: null };
  } catch (err) {
    return { name: mcpName, type: 'mcp', success: false, error: String(err) };
  }
}

export function syncAgentAll(
  db: Database.Database,
  agent: Agent,
  template: AgentTemplate,
  workspaceDir: string,
  symlink: SymlinkPlatform,
): SyncAgentAllResult {
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
    const result = syncMcpToWorkspace(db, agent, template, row.name, workspaceDir);
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
