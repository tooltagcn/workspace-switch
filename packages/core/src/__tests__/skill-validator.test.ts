import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateSkill } from '../skill/validator.js';

describe('validateSkill', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setup(): string {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-validate-'));
    return tmpDir;
  }

  function createSkillDir(baseDir: string, name: string, frontmatter: string): string {
    const dir = path.join(baseDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n# ${name}\n`);
    return dir;
  }

  it('validates a correct skill', () => {
    const base = setup();
    const dir = createSkillDir(base, 'good-skill', 'name: good-skill\ndescription: This is a valid skill description');

    const result = validateSkill(dir);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.name).toBe('good-skill');
    expect(result.description).toBe('This is a valid skill description');
  });

  it('fails when SKILL.md is missing', () => {
    const base = setup();
    const dir = path.join(base, 'no-md');
    fs.mkdirSync(dir);

    const result = validateSkill(dir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing SKILL.md file');
  });

  it('fails when directory does not exist', () => {
    const result = validateSkill('/nonexistent/path');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('does not exist');
  });

  it('fails when name is missing from frontmatter', () => {
    const base = setup();
    const dir = createSkillDir(base, 'no-name', 'description: A description that is long enough');

    const result = validateSkill(dir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing "name" in SKILL.md frontmatter');
  });

  it('fails when description is missing', () => {
    const base = setup();
    const dir = createSkillDir(base, 'no-desc', 'name: no-desc');

    const result = validateSkill(dir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing "description" in SKILL.md frontmatter');
  });

  it('fails when description is too short', () => {
    const base = setup();
    const dir = createSkillDir(base, 'short', 'name: short\ndescription: too short');

    const result = validateSkill(dir);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at least 10 characters');
  });

  it('detects duplicate names across skills', () => {
    const base = setup();
    const skillsDir = path.join(base, 'skills');
    createSkillDir(skillsDir, 'skill-a', 'name: same-name\ndescription: First skill here');
    const dir2 = createSkillDir(skillsDir, 'skill-b', 'name: same-name\ndescription: Second skill here');

    const result = validateSkill(dir2, skillsDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('passes when no frontmatter exists', () => {
    const base = setup();
    const dir = path.join(base, 'no-fm');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# Just a heading\nNo frontmatter here');

    const result = validateSkill(dir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing "name" in SKILL.md frontmatter');
    expect(result.errors).toContain('Missing "description" in SKILL.md frontmatter');
  });
});
