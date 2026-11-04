import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSkillManually, skillMdTemplate } from '../skill/manager.js';
import { validateSkillContent } from '../skill/validator.js';

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

  it('skillMdTemplate produces valid universal-format content', () => {
    const content = skillMdTemplate('tpl-skill', 'A template generated description');
    const validation = validateSkillContent(content);
    expect(validation.valid).toBe(true);
    expect(validation.name).toBe('tpl-skill');
  });

  it('creates a skill from explicit editor content', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'skills');

    const content = `---
name: editor-skill
description: Created from the editor with custom body
---

# editor-skill

Custom body written in the CodeMirror editor.
`;
    const result = createSkillManually({ skillsDir, name: 'editor-skill', content });

    expect(fs.readFileSync(result.skillMdPath, 'utf-8')).toBe(content);
  });

  it('rejects editor content whose frontmatter name does not match', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'skills');

    const content = `---
name: other-name
description: Frontmatter name does not match the skill name
---

# other-name
`;
    expect(() => createSkillManually({ skillsDir, name: 'my-skill', content })).toThrow(
      'must match the skill name',
    );
    expect(fs.existsSync(path.join(skillsDir, 'my-skill'))).toBe(false);
  });

  it('rejects invalid editor content and leaves no directory behind', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'skills');

    expect(() =>
      createSkillManually({ skillsDir, name: 'broken', content: '# no frontmatter\n' }),
    ).toThrow('Invalid SKILL.md content');
    expect(fs.existsSync(path.join(skillsDir, 'broken'))).toBe(false);
  });

  it('falls back to the template when content is omitted', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-manual-'));
    const skillsDir = path.join(tmpDir, 'skills');

    const result = createSkillManually({ skillsDir, name: 'fallback', description: 'A fallback template description' });
    const written = fs.readFileSync(result.skillMdPath, 'utf-8');
    expect(written).toBe(skillMdTemplate('fallback', 'A fallback template description'));
  });
});
