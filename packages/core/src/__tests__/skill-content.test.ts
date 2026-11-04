import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import { createSkill, getSkill } from '../skill/manager.js';
import { validateSkillContent } from '../skill/validator.js';
import { readSkillContent, saveSkillContent } from '../skill/content.js';

const VALID_CONTENT = `---
name: my-skill
description: A skill that does useful things
---

# my-skill

Body content here.
`;

describe('validateSkillContent', () => {
  it('accepts valid universal-format content', () => {
    const result = validateSkillContent(VALID_CONTENT);
    expect(result.valid).toBe(true);
    expect(result.name).toBe('my-skill');
    expect(result.description).toBe('A skill that does useful things');
  });

  it('rejects content without frontmatter block', () => {
    const result = validateSkillContent('# Just markdown\n\nno frontmatter\n');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('frontmatter');
  });

  it('rejects missing name and description', () => {
    const result = validateSkillContent('---\nname: only-name\n---\n\nbody\n');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"description"'))).toBe(true);
  });

  it('rejects short description', () => {
    const result = validateSkillContent('---\nname: x\ndescription: short\n---\n\nbody\n');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least 10 characters'))).toBe(true);
  });

  it('handles quoted frontmatter values', () => {
    const result = validateSkillContent('---\nname: "quoted-skill"\ndescription: \'A sufficiently long description\'\n---\n\nbody\n');
    expect(result.valid).toBe(true);
    expect(result.name).toBe('quoted-skill');
  });
});

describe('skill content read/save', () => {
  let tmpDir: string;
  let workspaceDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-content-'));
    workspaceDir = path.join(tmpDir, 'ws');
    fs.mkdirSync(path.join(workspaceDir, 'skills'), { recursive: true });
    db = new Database(path.join(tmpDir, 'test.db'));
    migrate(db);
  });

  afterEach(() => {
    db.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function seedSkill(name = 'my-skill', content = VALID_CONTENT) {
    const dir = path.join(workspaceDir, 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf-8');
    return createSkill(db, { name, sourcePath: dir, description: 'A skill that does useful things' });
  }

  describe('readSkillContent', () => {
    it('returns content and path for an existing skill', () => {
      const skill = seedSkill();
      const result = readSkillContent(db, skill.id, workspaceDir);
      expect(result).not.toBeNull();
      expect(result!.path).toBe(path.join(workspaceDir, 'skills', 'my-skill', 'SKILL.md'));
      expect(result!.content).toBe(VALID_CONTENT);
    });

    it('returns null for unknown skill id', () => {
      expect(readSkillContent(db, 'no-such-id', workspaceDir)).toBeNull();
    });

    it('throws when SKILL.md is missing', () => {
      const skill = seedSkill();
      fs.rmSync(path.join(workspaceDir, 'skills', 'my-skill', 'SKILL.md'));
      expect(() => readSkillContent(db, skill.id, workspaceDir)).toThrow('SKILL.md not found');
    });
  });

  describe('saveSkillContent', () => {
    it('writes content and syncs description to the database', () => {
      const skill = seedSkill();
      const before = getSkill(db, skill.id)!;

      const newContent = VALID_CONTENT.replace(
        'description: A skill that does useful things',
        'description: An updated and still long description',
      );
      const result = saveSkillContent(db, skill.id, newContent, workspaceDir);

      expect(result.saved).toBe(true);
      expect(result.validation.valid).toBe(true);
      expect(fs.readFileSync(result.skill.sourcePath! + '/SKILL.md', 'utf-8')).toBe(newContent);

      const after = getSkill(db, skill.id)!;
      expect(after.description).toBe('An updated and still long description');
      expect(after.updatedAt >= before.updatedAt).toBe(true);
    });

    it('rejects invalid content without touching file or database', () => {
      const skill = seedSkill();
      const result = saveSkillContent(db, skill.id, '# no frontmatter\n', workspaceDir);

      expect(result.saved).toBe(false);
      expect(result.validation.valid).toBe(false);

      const dir = path.join(workspaceDir, 'skills', 'my-skill');
      expect(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8')).toBe(VALID_CONTENT);
      expect(getSkill(db, skill.id)!.description).toBe('A skill that does useful things');
    });

    it('rejects renaming via content edit', () => {
      const skill = seedSkill();
      const renamed = VALID_CONTENT.replace('name: my-skill', 'name: other-name');
      const result = saveSkillContent(db, skill.id, renamed, workspaceDir);

      expect(result.saved).toBe(false);
      expect(result.validation.errors.some((e) => e.includes('Renaming'))).toBe(true);

      const dir = path.join(workspaceDir, 'skills', 'my-skill');
      expect(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8')).toBe(VALID_CONTENT);
      expect(getSkill(db, skill.id)!.name).toBe('my-skill');
    });

    it('preserves dir/frontmatter name mismatch from rename-strategy imports', () => {
      // Import dedup rename produces dir "my-skill-1" with frontmatter name "my-skill".
      const content = VALID_CONTENT; // frontmatter name: my-skill
      const dir = path.join(workspaceDir, 'skills', 'my-skill-1');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf-8');
      const skill = createSkill(db, { name: 'my-skill-1', sourcePath: dir });

      const edited = content.replace('Body content here.', 'Edited body content.');
      const result = saveSkillContent(db, skill.id, edited, workspaceDir);

      expect(result.saved).toBe(true);
      expect(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8')).toBe(edited);
    });

    it('throws for unknown skill id', () => {
      expect(() => saveSkillContent(db, 'nope', VALID_CONTENT, workspaceDir)).toThrow('Skill not found');
    });

    it('throws when skill directory is missing', () => {
      const skill = createSkill(db, { name: 'ghost', sourcePath: null });
      expect(() => saveSkillContent(db, skill.id, VALID_CONTENT, workspaceDir)).toThrow(
        'Skill directory not found',
      );
    });

    it('keeps name in sync with file when current file has no name yet', () => {
      const skill = seedSkill('broken', '---\ndescription: something long enough\n---\n\nbody\n');
      const fixed = '---\nname: broken\ndescription: something even longer now\n---\n\nbody\n';
      const result = saveSkillContent(db, skill.id, fixed, workspaceDir);
      expect(result.saved).toBe(true);
      expect(getSkill(db, skill.id)!.description).toBe('something even longer now');
    });
  });
});
