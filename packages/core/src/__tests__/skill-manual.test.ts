import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSkillManually } from '../skill/manager.js';

describe('createSkillManually', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates a skill directory with SKILL.md', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'skills');

    const result = createSkillManually({
      skillsDir,
      name: 'my-skill',
      description: 'A skill that does things well',
    });

    expect(result.name).toBe('my-skill');
    expect(fs.existsSync(result.skillMdPath)).toBe(true);

    const content = fs.readFileSync(result.skillMdPath, 'utf-8');
    expect(content).toContain('name: my-skill');
    expect(content).toContain('description: A skill that does things well');
    expect(content).toContain('# my-skill');
  });

  it('throws if skill already exists', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'skills');

    createSkillManually({ skillsDir, name: 'dup', description: 'First one is fine' });
    expect(() =>
      createSkillManually({ skillsDir, name: 'dup', description: 'Second should fail' }),
    ).toThrow('already exists');
  });

  it('creates parent directories if needed', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'deep', 'nested', 'skills');

    const result = createSkillManually({
      skillsDir,
      name: 'nested-skill',
      description: 'Created in nested directory structure',
    });

    expect(fs.existsSync(result.skillMdPath)).toBe(true);
  });
});
