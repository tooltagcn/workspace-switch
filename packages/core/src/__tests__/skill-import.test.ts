import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { importSkillFromLocal, importSkillFromGit, normalizeGitUrl } from '../skill/import.js';

describe('importSkillFromLocal', () => {
  let tmpDir: string;
  let skillsDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setup() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-import-'));
    skillsDir = path.join(tmpDir, 'skills');
  }

  it('imports a local directory as a skill', () => {
    setup();
    const source = path.join(tmpDir, 'my-skill-src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# My Skill');

    const result = importSkillFromLocal(source, 'my-skill', { skillsDir });
    expect(result.name).toBe('my-skill');
    expect(result.strategy).toBe('created');
    expect(fs.existsSync(path.join(result.dir, 'SKILL.md'))).toBe(true);
  });

  it('throws on duplicate with onDuplicate=error (default)', () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# Skill');

    importSkillFromLocal(source, 'dup', { skillsDir });
    expect(() => importSkillFromLocal(source, 'dup', { skillsDir })).toThrow('already exists');
  });

  it('overwrites on duplicate with onDuplicate=overwrite', () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# V1');

    importSkillFromLocal(source, 'dup', { skillsDir });

    fs.writeFileSync(path.join(source, 'SKILL.md'), '# V2');
    const result = importSkillFromLocal(source, 'dup', { skillsDir, onDuplicate: 'overwrite' });
    expect(result.strategy).toBe('overwritten');
    expect(fs.readFileSync(path.join(result.dir, 'SKILL.md'), 'utf-8')).toBe('# V2');
  });

  it('renames on duplicate with onDuplicate=rename', () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# Skill');

    importSkillFromLocal(source, 'dup', { skillsDir });
    const result = importSkillFromLocal(source, 'dup', { skillsDir, onDuplicate: 'rename' });
    expect(result.strategy).toBe('renamed');
    expect(result.name).toBe('dup-1');
  });

  it('throws for invalid source path', () => {
    setup();
    expect(() =>
      importSkillFromLocal('/nonexistent/path', 'test', { skillsDir }),
    ).toThrow('not a valid directory');
  });

  it('rejects symbolic links in source', () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'real.txt'), 'data');
    fs.symlinkSync(path.join(source, 'real.txt'), path.join(source, 'link.txt'));

    expect(() =>
      importSkillFromLocal(source, 'bad-symlink', { skillsDir }),
    ).toThrow('Symbolic links');
  });
});

describe('importSkillFromGit', () => {
  let tmpDir: string;
  let skillsDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('clones a local git repo into skills dir', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-git-'));
    skillsDir = path.join(tmpDir, 'skills');

    const bareRepo = path.join(tmpDir, 'bare-repo');
    const workDir = path.join(tmpDir, 'work');
    const { execFile: execFileCb } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execLocal = promisify(execFileCb);

    fs.mkdirSync(workDir);
    await execLocal('git', ['init', workDir]);
    await execLocal('git', ['-C', workDir, 'config', 'user.email', 'test@test.com']);
    await execLocal('git', ['-C', workDir, 'config', 'user.name', 'Test']);
    fs.writeFileSync(path.join(workDir, 'SKILL.md'), '# Git Skill');
    await execLocal('git', ['-C', workDir, 'add', '.']);
    await execLocal('git', ['-C', workDir, 'commit', '-m', 'init']);
    await execLocal('git', ['clone', '--bare', workDir, bareRepo]);

    const result = await importSkillFromGit(bareRepo, 'git-skill', { skillsDir });
    expect(result.name).toBe('git-skill');
    expect(result.strategy).toBe('created');
    expect(fs.existsSync(path.join(result.dir, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(result.dir, '.git'))).toBe(false);
  }, 15000);

  it('handles duplicate strategies for git import', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-git-'));
    skillsDir = path.join(tmpDir, 'skills');

    const bareRepo = path.join(tmpDir, 'bare-repo');
    const workDir = path.join(tmpDir, 'work');
    const { execFile: execFileCb } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execLocal = promisify(execFileCb);

    fs.mkdirSync(workDir);
    await execLocal('git', ['init', workDir]);
    await execLocal('git', ['-C', workDir, 'config', 'user.email', 'test@test.com']);
    await execLocal('git', ['-C', workDir, 'config', 'user.name', 'Test']);
    fs.writeFileSync(path.join(workDir, 'SKILL.md'), '# V1');
    await execLocal('git', ['-C', workDir, 'add', '.']);
    await execLocal('git', ['-C', workDir, 'commit', '-m', 'init']);
    await execLocal('git', ['clone', '--bare', workDir, bareRepo]);

    await importSkillFromGit(bareRepo, 'dup', { skillsDir });
    await expect(importSkillFromGit(bareRepo, 'dup', { skillsDir })).rejects.toThrow(
      'already exists',
    );
  }, 15000);
});

describe('normalizeGitUrl', () => {
  it('expands owner/repo to GitHub URL', () => {
    expect(normalizeGitUrl('user/repo')).toBe('https://github.com/user/repo.git');
  });

  it('expands owner/repo.git to GitHub URL', () => {
    expect(normalizeGitUrl('user/repo.git')).toBe('https://github.com/user/repo.git');
  });

  it('passes through full URLs', () => {
    expect(normalizeGitUrl('https://gitlab.com/user/repo.git')).toBe(
      'https://gitlab.com/user/repo.git',
    );
  });
});
