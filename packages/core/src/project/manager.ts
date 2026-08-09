import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectWithAgents } from './types.js';
import { initializeProjectAgents, getEnabledAgentsForProject } from './agent-enablement.js';
import { cleanupProjectResources } from '../sync/project-sync.js';
import type { SymlinkPlatform } from '../sync/platform.js';

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProjects(db: Database.Database, search?: string): Project[] {
  let sql = 'SELECT * FROM project';
  const params: unknown[] = [];

  if (search) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY name ASC';

  const rows = db.prepare(sql).all(...params) as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(db: Database.Database, id: string): Project | null {
  const row = db.prepare('SELECT * FROM project WHERE id = ?').get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function getProjectByPath(db: Database.Database, projectPath: string): Project | null {
  const row = db.prepare('SELECT * FROM project WHERE path = ?').get(projectPath) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(db: Database.Database, input: CreateProjectInput): Project {
  const existing = getProjectByPath(db, input.path);
  if (existing) {
    throw new Error(`A project with path "${input.path}" already exists`);
  }

  const id = randomUUID();
  const name = input.name?.trim() || path.basename(input.path);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO project (id, name, path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, name, input.path, now, now);

  initializeProjectAgents(db, id, input.path);

  return getProject(db, id)!;
}

export function updateProject(db: Database.Database, id: string, input: UpdateProjectInput): Project | null {
  const existing = getProject(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE project SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getProject(db, id)!;
}

export function deleteProject(db: Database.Database, id: string, symlink?: SymlinkPlatform): boolean {
  const existing = getProject(db, id);
  if (!existing) return false;

  if (symlink) {
    cleanupProjectResources(db, id, symlink);
  }

  db.prepare('DELETE FROM project_agent WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM project WHERE id = ?').run(id);

  return true;
}

export function getProjectWithAgents(db: Database.Database, id: string): ProjectWithAgents | null {
  const project = getProject(db, id);
  if (!project) return null;

  const agents = getEnabledAgentsForProject(db, id);
  return { ...project, agents };
}
