import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Agent } from '../agent/types.js';
import type { AgentTemplate } from '../agent/template-types.js';
import type { SymlinkPlatform } from './platform.js';
import type { SyncResult, SyncAgentAllResult } from './agent-sync.js';
import type { Project, ProjectSkill } from '../project/types.js';
import type { SecretStore } from '../mcp/types.js';
import { loadMcpFromWorkspace } from '../mcp/storage.js';
import { parseConfigFile, serializeConfigFile, buildMcpEntry } from '../mcp/renderer.js';
import { mutateConfig } from '../mcp/mutation.js';
import { expandCustomPath } from '../agent/expand-paths.js';

function resolveProjectAgentPath(project: Project, agent: Agent): string | null {
  if (!agent.skillDir) return null;
  return path.join(project.path, agent.configDirName, agent.skillDir);
}

export function syncProjectSkillToWorkspace(
  db: Database.Database,
  project: Project,
  agent: Agent,
  skillName: string,
  workspaceDir: string,
  symlink: SymlinkPlatform,
): SyncResult {
  if (!agent.skillDir) {
    return { name: skillName, type: 'skill', success: false, error: 'Agent has no skill directory configured' };
  }

  const trustedSource = path.join(workspaceDir, 'skills', skillName);
  if (!fs.existsSync(trustedSource)) {
    return { name: skillName, type: 'skill', success: false, error: `Trusted source not found: ${trustedSource}` };
  }

  if (!fs.existsSync(project.path)) {
    return { name: skillName, type: 'skill', success: false, error: `Project path does not exist: ${project.path}` };
  }

  const agentLocalPath = path.join(project.path, agent.configDirName, agent.skillDir, skillName);

  const alreadyApplied = db
    .prepare(
      `SELECT 1 FROM project_resource_agent
       WHERE resource_type = 'skill' AND project_id = ? AND agent_id = ?
       AND resource_id = (SELECT id FROM skill WHERE name = ?)`,
    )
    .get(project.id, agent.id, skillName);

  if (alreadyApplied) {
    return { name: skillName, type: 'skill', success: false, error: 'Skill is already applied to this project and agent' };
  }

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
    db.prepare(
      `INSERT INTO project_resource_agent (resource_type, resource_id, project_id, agent_id, target_path, symlinked, applied_at)
       VALUES ('skill', (SELECT id FROM skill WHERE name = ?), ?, ?, ?, 1, ?)`,
    ).run(skillName, project.id, agent.id, agentLocalPath, now);

    return { name: skillName, type: 'skill', success: true, error: null };
  } catch (err) {
    return { name: skillName, type: 'skill', success: false, error: String(err) };
  }
}

export function unsyncProjectSkillFromWorkspace(
  db: Database.Database,
  project: Project,
  agent: Agent,
  skillName: string,
  symlink: SymlinkPlatform,
): SyncResult {
  const row = db
    .prepare(
      `SELECT target_path FROM project_resource_agent
       WHERE resource_type = 'skill' AND project_id = ? AND agent_id = ?
       AND resource_id = (SELECT id FROM skill WHERE name = ?)`,
    )
    .get(project.id, agent.id, skillName) as { target_path: string | null } | undefined;

  if (!row) {
    return { name: skillName, type: 'skill', success: false, error: 'Skill is not applied to this project and agent' };
  }

  try {
    if (row.target_path && fs.existsSync(row.target_path)) {
      symlink.removeSymlink(row.target_path);
    }

    db.prepare(
      `DELETE FROM project_resource_agent
       WHERE resource_type = 'skill' AND project_id = ? AND agent_id = ?
       AND resource_id = (SELECT id FROM skill WHERE name = ?)`,
    ).run(project.id, agent.id, skillName);

    return { name: skillName, type: 'skill', success: true, error: null };
  } catch (err) {
    return { name: skillName, type: 'skill', success: false, error: String(err) };
  }
}

export function getProjectSkillList(db: Database.Database, projectId: string): ProjectSkill[] {
  const rows = db.prepare(
    `SELECT s.id AS skill_id, s.name, s.description,
            GROUP_CONCAT(DISTINCT a.name) AS agent_names,
           pra.resource_id
     FROM project_resource_agent pra
     JOIN skill s ON s.id = pra.resource_id
     JOIN agent a ON a.id = pra.agent_id
     WHERE pra.project_id = ? AND pra.resource_type = 'skill' AND a.enabled = 1
     GROUP BY pra.resource_id
     ORDER BY s.name ASC`,
  ).all(projectId) as { skill_id: string; name: string; description: string | null; agent_names: string | null }[];

  const result: ProjectSkill[] = [];
  for (const row of rows) {
    const tags = db
      .prepare(
        `SELECT t.name FROM resource_tag rt
         JOIN tag t ON t.id = rt.tag_id
         WHERE rt.resource_type = 'skill' AND rt.resource_id = ?`,
      )
      .all(row.skill_id) as { name: string }[];

    const agentPaths = db
      .prepare(
        `SELECT a.name AS agent_name, pra.target_path
         FROM project_resource_agent pra
         JOIN agent a ON a.id = pra.agent_id
         WHERE pra.project_id = ? AND pra.resource_type = 'skill' AND pra.resource_id = ? AND a.enabled = 1`,
      )
      .all(projectId, row.skill_id) as { agent_name: string; target_path: string | null }[];

    const appliedAgents: string[] = [];
    const brokenAgents: string[] = [];

    for (const ap of agentPaths) {
      appliedAgents.push(ap.agent_name);
      if (ap.target_path && !fs.existsSync(ap.target_path)) {
        brokenAgents.push(ap.agent_name);
      }
    }

    result.push({
      skillId: row.skill_id,
      name: row.name,
      description: row.description,
      tags: tags.map((t) => t.name),
      appliedAgents,
      brokenAgents,
    });
  }

  return result;
}

export async function syncProjectMcpToWorkspace(
  db: Database.Database,
  project: Project,
  agent: Agent,
  template: AgentTemplate,
  mcpName: string,
  workspaceDir: string,
  secretStore?: SecretStore,
): Promise<SyncResult> {
  if (!template.mcpFile || !template.mcpField) {
    return { name: mcpName, type: 'mcp', success: false, error: 'Agent does not support MCP' };
  }

  if (!fs.existsSync(project.path)) {
    return { name: mcpName, type: 'mcp', success: false, error: `Project path does not exist: ${project.path}` };
  }

  const trustedSchema = loadMcpFromWorkspace(workspaceDir, mcpName);
  if (!trustedSchema) {
    return { name: mcpName, type: 'mcp', success: false, error: `Trusted MCP source not found: ${mcpName}` };
  }

  const agentConfigPath = agent.mcpConfigPath
    ? expandCustomPath(agent.mcpConfigPath)
    : path.join(project.path, agent.configDirName, template.mcpFile);

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
    const fieldMapping = template.entryFormat?.fieldMapping;
    const afterObj = mutateConfig(existing, field, {
      type: 'add',
      name: mcpName,
      entry: buildMcpEntry(schemaWithSecrets, fieldMapping),
    });
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
        `SELECT 1 FROM project_resource_agent
         WHERE resource_type = 'mcp' AND resource_id = ? AND project_id = ? AND agent_id = ?`,
      )
      .get(mcpRow.id, project.id, agent.id);

    if (existingRecord) {
      db.prepare(
        `UPDATE project_resource_agent SET target_path = ?, applied_config_hash = ?, applied_at = ?
         WHERE resource_type = 'mcp' AND resource_id = ? AND project_id = ? AND agent_id = ?`,
      ).run(agentConfigPath, mcpRow.config_hash, now, mcpRow.id, project.id, agent.id);
    } else {
      db.prepare(
        `INSERT INTO project_resource_agent (resource_type, resource_id, project_id, agent_id, target_path, symlinked, applied_config_hash, applied_at)
         VALUES ('mcp', ?, ?, ?, ?, 0, ?, ?)`,
      ).run(mcpRow.id, project.id, agent.id, agentConfigPath, mcpRow.config_hash, now);
    }

    return { name: mcpName, type: 'mcp', success: true, error: null };
  } catch (err) {
    return { name: mcpName, type: 'mcp', success: false, error: String(err) };
  }
}

export function unsyncProjectMcpFromWorkspace(
  db: Database.Database,
  project: Project,
  agent: Agent,
  template: AgentTemplate,
  mcpName: string,
): SyncResult {
  if (!template.mcpFile || !template.mcpField) {
    return { name: mcpName, type: 'mcp', success: false, error: 'Agent does not support MCP' };
  }

  const agentConfigPath = agent.mcpConfigPath
    ? expandCustomPath(agent.mcpConfigPath)
    : path.join(project.path, agent.configDirName, template.mcpFile);

  try {
    const mcpRow = db.prepare('SELECT id FROM mcp WHERE name = ?').get(mcpName) as { id: string } | undefined;
    if (!mcpRow) {
      return { name: mcpName, type: 'mcp', success: false, error: `MCP not found in database: ${mcpName}` };
    }

    const existingRecord = db
      .prepare(
        `SELECT 1 FROM project_resource_agent
         WHERE resource_type = 'mcp' AND resource_id = ? AND project_id = ? AND agent_id = ?`,
      )
      .get(mcpRow.id, project.id, agent.id);

    if (!existingRecord) {
      return { name: mcpName, type: 'mcp', success: false, error: `MCP '${mcpName}' is not applied to project '${project.id}' and agent '${agent.id}'` };
    }

    if (!fs.existsSync(agentConfigPath)) {
      db.prepare(
        `DELETE FROM project_resource_agent
         WHERE resource_type = 'mcp' AND resource_id = ? AND project_id = ? AND agent_id = ?`,
      ).run(mcpRow.id, project.id, agent.id);
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
    const afterObj = mutateConfig(existing, field, { type: 'remove', name: mcpName });
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
      `DELETE FROM project_resource_agent
       WHERE resource_type = 'mcp' AND resource_id = ? AND project_id = ? AND agent_id = ?`,
    ).run(mcpRow.id, project.id, agent.id);

    return { name: mcpName, type: 'mcp', success: true, error: null };
  } catch (err) {
    return { name: mcpName, type: 'mcp', success: false, error: String(err) };
  }
}

export function cleanupProjectResources(
  db: Database.Database,
  projectId: string,
  symlink: SymlinkPlatform,
): void {
  // Clean up skill symlinks
  const skillRows = db
    .prepare(
      `SELECT target_path FROM project_resource_agent WHERE project_id = ? AND resource_type = 'skill' AND target_path IS NOT NULL`,
    )
    .all(projectId) as { target_path: string }[];

  for (const row of skillRows) {
    try {
      if (fs.existsSync(row.target_path)) {
        symlink.removeSymlink(row.target_path);
      }
    } catch {
      // best-effort cleanup
    }
  }

  // Clean up MCP config entries
  const mcpRows = db
    .prepare(
      `SELECT pra.*, m.name as mcp_name, a.config_dir_name, a.id as agent_id
       FROM project_resource_agent pra
       JOIN mcp m ON m.id = pra.resource_id
       JOIN agent a ON a.id = pra.agent_id
       WHERE pra.project_id = ? AND pra.resource_type = 'mcp'`,
    )
    .all(projectId) as { target_path: string; mcp_name: string; config_dir_name: string; agent_id: string }[];

  // Group by target_path to avoid processing the same file multiple times
  const filesToClean = new Map<string, string[]>();
  for (const row of mcpRows) {
    if (row.target_path) {
      const existing = filesToClean.get(row.target_path) ?? [];
      existing.push(row.mcp_name);
      filesToClean.set(row.target_path, existing);
    }
  }

  for (const [filePath, mcpNames] of filesToClean) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.json') {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(content);
        } catch {
          continue;
        }

        for (const field of ['mcpServers', 'mcp', 'servers']) {
          if (parsed[field] && typeof parsed[field] === 'object') {
            const section = parsed[field] as Record<string, unknown>;
            for (const mcpName of mcpNames) {
              delete section[mcpName];
            }
          }
        }

        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
      } else if (ext === '.toml') {
        const lines = content.split('\n');
        const result: string[] = [];
        let skip = false;

        for (const line of lines) {
          const trimmed = line.trim();
          const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
          if (sectionMatch) {
            const sectionPath = sectionMatch[1];
            const isTarget = mcpNames.some((name) =>
              sectionPath === `mcpServers.${name}` || sectionPath === `mcp.${name}` || sectionPath === `servers.${name}`,
            );
            skip = isTarget;
          }
          if (!skip) {
            result.push(line);
          }
        }

        fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
      } else if (ext === '.yaml' || ext === '.yml') {
        const lines = content.split('\n');
        const result: string[] = [];
        let skip = false;
        let skipIndent = -1;

        for (const line of lines) {
          if (!line.trim()) {
            if (!skip) result.push(line);
            continue;
          }

          const indent = line.length - line.trimStart().length;
          const trimmed = line.trim();

          if (skip) {
            if (indent > skipIndent) {
              continue;
            }
            skip = false;
            skipIndent = -1;
          }

          const isMcpEntry = mcpNames.some((name) => trimmed === `${name}:` || trimmed.startsWith(`${name}:`));
          if (isMcpEntry && indent >= 2) {
            skip = true;
            skipIndent = indent;
            continue;
          }

          result.push(line);
        }

        fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
      }
    } catch {
      // best-effort cleanup
    }
  }

  db.prepare('DELETE FROM project_resource_agent WHERE project_id = ?').run(projectId);
}
