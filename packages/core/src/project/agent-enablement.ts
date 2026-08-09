import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { ProjectAgentEnablement } from './types.js';

export function initializeProjectAgents(db: Database.Database, projectId: string, projectPath: string): void {
  const agents = db.prepare('SELECT id, config_dir_name FROM agent WHERE enabled = 1').all() as { id: string; config_dir_name: string }[];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO project_agent (project_id, agent_id, enabled)
     VALUES (?, ?, ?)`,
  );

  for (const agent of agents) {
    const agentDirExists = fs.existsSync(path.join(projectPath, agent.config_dir_name));
    insert.run(projectId, agent.id, agentDirExists ? 1 : 0);
  }
}

export function getEnabledAgentsForProject(db: Database.Database, projectId: string): ProjectAgentEnablement[] {
  const rows = db.prepare(
    `SELECT pa.agent_id, pa.enabled, a.name, a.config_dir_name
     FROM project_agent pa
     JOIN agent a ON a.id = pa.agent_id
     WHERE pa.project_id = ? AND a.enabled = 1
     ORDER BY a.name ASC`,
  ).all(projectId) as { agent_id: string; enabled: number; name: string; config_dir_name: string }[];

  return rows.map((row) => ({
    agentId: row.agent_id,
    agentName: row.name,
    configDirName: row.config_dir_name,
    enabled: row.enabled === 1,
  }));
}

export function toggleAgentForProject(
  db: Database.Database,
  projectId: string,
  agentId: string,
  enabled: boolean,
): void {
  const existing = db
    .prepare('SELECT 1 FROM project_agent WHERE project_id = ? AND agent_id = ?')
    .get(projectId, agentId);

  if (existing) {
    db.prepare(
      'UPDATE project_agent SET enabled = ? WHERE project_id = ? AND agent_id = ?',
    ).run(enabled ? 1 : 0, projectId, agentId);
  } else {
    db.prepare(
      'INSERT INTO project_agent (project_id, agent_id, enabled) VALUES (?, ?, ?)',
    ).run(projectId, agentId, enabled ? 1 : 0);
  }
}
