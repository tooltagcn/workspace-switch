import fs from 'node:fs';
import path from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  name?: string;
  description?: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) fields[key] = value;
  }
  return fields;
}

export function validateSkill(skillDir: string, skillsDir?: string): ValidationResult {
  const errors: string[] = [];
  const resolved = path.resolve(skillDir);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return { valid: false, errors: [`Skill directory does not exist: ${resolved}`] };
  }

  const skillMdPath = path.join(resolved, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    return { valid: false, errors: ['Missing SKILL.md file'] };
  }

  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  const name = frontmatter.name;
  if (!name) {
    errors.push('Missing "name" in SKILL.md frontmatter');
  }

  const description = frontmatter.description;
  if (!description) {
    errors.push('Missing "description" in SKILL.md frontmatter');
  } else if (description.length < 10) {
    errors.push(`Description must be at least 10 characters (got ${description.length})`);
  }

  if (name && skillsDir) {
    const resolvedSkillsDir = path.resolve(skillsDir);
    const siblings = fs.readdirSync(resolvedSkillsDir, { withFileTypes: true });
    for (const sibling of siblings) {
      if (!sibling.isDirectory()) continue;
      if (sibling.name === path.basename(resolved)) continue;

      const siblingMd = path.join(resolvedSkillsDir, sibling.name, 'SKILL.md');
      if (!fs.existsSync(siblingMd)) continue;

      const siblingContent = fs.readFileSync(siblingMd, 'utf-8');
      const siblingFm = parseFrontmatter(siblingContent);
      if (siblingFm.name === name) {
        errors.push(`Duplicate skill name "${name}" found in ${sibling.name}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, name, description };
}
