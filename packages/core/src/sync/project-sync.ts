import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Agent } from '../agent/types.js';
import type { SymlinkPlatform } from './platform.js';
import type { SyncResult } from './agent-sync.js';
import type { Project, ProjectSkill } from '../project/types.js';

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

export function cleanupProjectResources(
  db: Database.Database,
  projectId: string,
  symlink: SymlinkPlatform,
): void {
  const rows = db
    .prepare(
      `SELECT target_path FROM project_resource_agent WHERE project_id = ? AND target_path IS NOT NULL`,
    )
    .all(projectId) as { target_path: string }[];

  for (const row of rows) {
    try {
      if (fs.existsSync(row.target_path)) {
        symlink.removeSymlink(row.target_path);
      }
    } catch {
      // best-effort cleanup
    }
  }

  db.prepare('DELETE FROM project_resource_agent WHERE project_id = ?').run(projectId);
}
