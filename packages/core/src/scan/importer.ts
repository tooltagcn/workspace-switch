import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ScannedSkill, ScannedMcp } from './types.js';
import { saveMcpToWorkspace } from '../mcp/storage.js';

export interface ImportSkillResult {
  name: string;
  destinationPath: string;
  classification: 'new' | 'conflict';
  alreadyExisted: boolean;
}

export interface ImportMcpResult {
  name: string;
  destinationPath: string;
  classification: 'new' | 'conflict';
  alreadyExisted: boolean;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      fs.symlinkSync(target, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function importScannedSkills(
  db: Database.Database,
  skills: ScannedSkill[],
  workspaceDir: string,
): ImportSkillResult[] {
  const results: ImportSkillResult[] = [];
  const skillsDir = path.join(workspaceDir, 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  for (const skill of skills) {
    if (skill.classification === 'synced') continue;

    const destPath = path.join(skillsDir, skill.name);
    const alreadyExisted = fs.existsSync(destPath);

    if (!alreadyExisted) {
      copyDirRecursive(skill.sourcePath, destPath);
    }

    const existingRow = db
      .prepare('SELECT id FROM skill WHERE name = ?')
      .get(skill.name) as { id: string } | undefined;

    const now = new Date().toISOString();

    if (!existingRow) {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO skill (id, name, description, source_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, skill.name, skill.description ?? null, destPath, now, now);

      db.prepare(
        `INSERT INTO resource_agent (resource_type, resource_id, agent_id, target_path, symlinked, applied_at)
         VALUES ('skill', ?, ?, ?, 0, ?)`,
      ).run(id, skill.agentId, destPath, now);
    }

    results.push({
      name: skill.name,
      destinationPath: destPath,
      classification: skill.classification as 'new' | 'conflict',
      alreadyExisted,
    });
  }

  return results;
}

export function importScannedMcps(
  db: Database.Database,
  mcps: ScannedMcp[],
  workspaceDir: string,
): ImportMcpResult[] {
  const results: ImportMcpResult[] = [];

  for (const mcp of mcps) {
    if (mcp.classification === 'synced') continue;

    const destPath = saveMcpToWorkspace(workspaceDir, mcp.schema);
    const alreadyExisted = db
      .prepare('SELECT id FROM mcp WHERE name = ?')
      .get(mcp.name) !== undefined;

    const existingRow = db
      .prepare('SELECT id FROM mcp WHERE name = ?')
      .get(mcp.name) as { id: string } | undefined;

    const now = new Date().toISOString();

    if (!existingRow) {
      const id = randomUUID();
      const schema = mcp.schema;
      db.prepare(
        `INSERT INTO mcp (id, name, transport, command, url, args_json, env_json, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        schema.name,
        schema.transport,
        schema.command ?? null,
        schema.url ?? null,
        schema.args ? JSON.stringify(schema.args) : null,
        schema.env ? JSON.stringify(schema.env) : null,
        schema.description ?? null,
        now,
        now,
      );

      db.prepare(
        `INSERT INTO resource_agent (resource_type, resource_id, agent_id, target_path, symlinked, applied_at)
         VALUES ('mcp', ?, ?, ?, 0, ?)`,
      ).run(id, mcp.agentId, destPath, now);
    }

    results.push({
      name: mcp.name,
      destinationPath: destPath,
      classification: mcp.classification as 'new' | 'conflict',
      alreadyExisted,
    });
  }

  return results;
}
