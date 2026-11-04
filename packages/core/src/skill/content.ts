import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Skill } from './types.js';
import { getSkill, updateSkill } from './manager.js';
import { validateSkillContent } from './validator.js';
import type { ValidationResult } from './validator.js';

export interface SkillContentResult {
  skill: Skill;
  path: string;
  content: string;
}

export interface SaveSkillContentResult {
  skill: Skill;
  validation: ValidationResult;
  saved: boolean;
}

/**
 * Canonical SKILL.md location. Always derived from the workspace skills dir
 * (never from raw user input), so writes stay inside the trusted source.
 */
function resolveSkillMdPath(skill: Skill, workspaceDir: string): string {
  return path.join(workspaceDir, 'skills', skill.name, 'SKILL.md');
}

export function readSkillContent(
  db: Database.Database,
  skillId: string,
  workspaceDir: string,
): SkillContentResult | null {
  const skill = getSkill(db, skillId);
  if (!skill) return null;

  const skillMdPath = resolveSkillMdPath(skill, workspaceDir);
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`SKILL.md not found: ${skillMdPath}`);
  }

  return { skill, path: skillMdPath, content: fs.readFileSync(skillMdPath, 'utf-8') };
}

export function saveSkillContent(
  db: Database.Database,
  skillId: string,
  content: string,
  workspaceDir: string,
): SaveSkillContentResult {
  const skill = getSkill(db, skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  const validation = validateSkillContent(content);
  if (!validation.valid) {
    return { skill, validation, saved: false };
  }

  const skillMdPath = resolveSkillMdPath(skill, workspaceDir);
  const dir = path.dirname(skillMdPath);
  if (!fs.existsSync(dir)) {
    throw new Error(`Skill directory not found: ${dir}`);
  }

  // Renaming via content edit is not allowed: the skill name is the identity
  // used for the workspace directory, DB row, and every applied symlink.
  // (The dir name may legitimately differ from the frontmatter name, e.g.
  // imports deduplicated with the "rename" strategy — that pre-existing state
  // is preserved as long as the user does not change the name field.)
  const existing = readSkillContent(db, skillId, workspaceDir);
  const currentName = existing ? validateSkillContent(existing.content).name : undefined;
  if (currentName !== undefined && validation.name !== currentName) {
    return {
      skill,
      validation: {
        ...validation,
        valid: false,
        errors: [
          `Renaming via content edit is not supported (name changed from "${currentName}" to "${validation.name}"). Remove and re-import the skill to rename it.`,
        ],
      },
      saved: false,
    };
  }

  const tmpPath = path.join(dir, `.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, skillMdPath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup failure
    }
    throw err;
  }

  const updated = updateSkill(db, skillId, { description: validation.description ?? null });
  return { skill: updated ?? skill, validation, saved: true };
}
