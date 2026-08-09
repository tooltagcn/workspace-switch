import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { createSkill, listSkills, deleteSkill } from '../skill/manager.js';
import { validateSkill } from '../skill/validator.js';
import { createMcp, listMcps, deleteMcp } from '../mcp/manager.js';
import { saveMcpToWorkspace, loadMcpFromWorkspace } from '../mcp/storage.js';
import type { WsMcpSchema } from '../mcp/schema.js';

export interface ConsistencyItem {
  name: string;
  location: 'directory' | 'database';
  action: 'sync' | 'delete';
  id?: string;
  sourcePath?: string;
  outOfSync?: boolean;
  agentId?: string;
  agentName?: string;
  orphaned?: boolean;
  missingFile?: boolean;
  targetPath?: string;
}

export interface ConsistencyResult {
  consistent: boolean;
  items: ConsistencyItem[];
  directoryCount: number;
  databaseCount: number;
}

export interface FixResult {
  synced: string[];
  deleted: string[];
}

export function checkSkillConsistency(
  db: Database.Database,
  dataDir: string,
): ConsistencyResult {
  const skillsDir = path.join(dataDir, 'skills');
  const items: ConsistencyItem[] = [];

  const dirNames = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  const dbSkills = listSkills(db);
  const dbSkillNames = new Set(dbSkills.map((s) => s.name));
  const dirNameSet = new Set(dirNames);

  for (const name of dirNames) {
    if (!dbSkillNames.has(name)) {
      items.push({
        name,
        location: 'directory',
        action: 'sync',
        sourcePath: path.join(skillsDir, name),
      });
    }
  }

  for (const skill of dbSkills) {
    if (!dirNameSet.has(skill.name)) {
      items.push({
        name: skill.name,
        location: 'database',
        action: 'delete',
        id: skill.id,
      });
    }
  }

  return {
    consistent: items.length === 0,
    items,
    directoryCount: dirNames.length,
    databaseCount: dbSkills.length,
  };
}

export function fixSkillConsistency(
  db: Database.Database,
  dataDir: string,
): FixResult {
  const check = checkSkillConsistency(db, dataDir);
  const result: FixResult = { synced: [], deleted: [] };

  for (const item of check.items) {
    if (item.action === 'sync' && item.location === 'directory') {
      const sourcePath = path.join(dataDir, 'skills', item.name);
      const validation = validateSkill(sourcePath);
      createSkill(db, {
        name: item.name,
        sourcePath,
        description: validation.description ?? null,
      });
      result.synced.push(item.name);
    } else if (item.action === 'delete' && item.location === 'database' && item.id) {
      deleteSkill(db, item.id);
      result.deleted.push(item.name);
    }
  }

  return result;
}

export function checkMcpConsistency(
  db: Database.Database,
  dataDir: string,
): ConsistencyResult {
  const mcpDir = path.join(dataDir, 'mcp');
  const items: ConsistencyItem[] = [];

  const fileNames = fs.existsSync(mcpDir)
    ? fs.readdirSync(mcpDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
    : [];

  const dbMcps = listMcps(db);
  const dbMcpNames = new Set(dbMcps.map((m) => m.name));
  const fileNameSet = new Set(fileNames);

  for (const name of fileNames) {
    if (!dbMcpNames.has(name)) {
      items.push({
        name,
        location: 'directory',
        action: 'sync',
        sourcePath: path.join(mcpDir, `${name}.json`),
      });
    }
  }

  for (const mcp of dbMcps) {
    if (!fileNameSet.has(mcp.name)) {
      items.push({
        name: mcp.name,
        location: 'database',
        action: 'delete',
        id: mcp.id,
      });
    }
  }

  const appliedMcps = db
    .prepare(
      `SELECT pra.resource_id, pra.agent_id, pra.applied_config_hash, pra.target_path,
              m.name as mcp_name, m.config_hash, a.name as agent_name
       FROM resource_agent pra
       LEFT JOIN mcp m ON m.id = pra.resource_id
       LEFT JOIN agent a ON a.id = pra.agent_id
       WHERE pra.resource_type = 'mcp'`,
    )
    .all() as {
    resource_id: string;
    agent_id: string;
    applied_config_hash: string | null;
    target_path: string | null;
    mcp_name: string | null;
    config_hash: string | null;
    agent_name: string | null;
  }[];

  for (const applied of appliedMcps) {
    if (!applied.mcp_name) {
      items.push({
        name: `orphaned-${applied.resource_id}`,
        location: 'database',
        action: 'delete',
        orphaned: true,
        agentId: applied.agent_id,
        agentName: applied.agent_name || 'Unknown',
      });
      continue;
    }

    if (!applied.agent_name) {
      items.push({
        name: applied.mcp_name,
        location: 'database',
        action: 'delete',
        orphaned: true,
        agentId: applied.agent_id,
        agentName: 'Deleted Agent',
      });
      continue;
    }

    if (applied.target_path && !fs.existsSync(applied.target_path)) {
      items.push({
        name: applied.mcp_name,
        location: 'database',
        action: 'sync',
        missingFile: true,
        agentId: applied.agent_id,
        agentName: applied.agent_name,
        targetPath: applied.target_path,
      });
    }

    if (applied.applied_config_hash && applied.config_hash && applied.applied_config_hash !== applied.config_hash) {
      items.push({
        name: applied.mcp_name,
        location: 'database',
        action: 'sync',
        outOfSync: true,
        agentId: applied.agent_id,
        agentName: applied.agent_name,
      });
    }
  }

  return {
    consistent: items.length === 0,
    items,
    directoryCount: fileNames.length,
    databaseCount: dbMcps.length,
  };
}

export function fixMcpConsistency(
  db: Database.Database,
  dataDir: string,
): FixResult {
  const check = checkMcpConsistency(db, dataDir);
  const result: FixResult = { synced: [], deleted: [] };

  for (const item of check.items) {
    if (item.action === 'sync' && item.location === 'directory') {
      const schema = loadMcpFromWorkspace(dataDir, item.name);
      if (schema) {
        createMcp(db, {
          name: schema.name,
          transport: schema.transport,
          command: schema.command ?? null,
          url: schema.url ?? null,
          args: schema.args ?? [],
          env: schema.env ?? {},
          description: schema.description ?? null,
        });
        result.synced.push(item.name);
      }
    } else if (item.action === 'delete' && item.location === 'database' && item.id) {
      deleteMcp(db, item.id);
      result.deleted.push(item.name);
    }
  }

  return result;
}
