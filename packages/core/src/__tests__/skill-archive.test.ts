import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { importSkillFromArchive } from '../skill/archive.js';

const execFileAsync = promisify(execFile);

describe('importSkillFromArchive', () => {
  let tmpDir: string;
  let skillsDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setup() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-archive-'));
    skillsDir = path.join(tmpDir, 'skills');
  }

  async function createZip(sourceDir: string, outputPath: string): Promise<void> {
    await execFileAsync('zip', ['-r', outputPath, '.'], { cwd: sourceDir });
  }

  async function createTarGz(sourceDir: string, outputPath: string): Promise<void> {
    await execFileAsync('tar', ['czf', outputPath, '-C', sourceDir, '.']);
  }

  it('imports from a zip archive', async () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# Zip Skill');

    const archive = path.join(tmpDir, 'skill.zip');
    await createZip(source, archive);

    const result = await importSkillFromArchive(archive, 'zip-skill', { skillsDir });
    expect(result.name).toBe('zip-skill');
    expect(result.strategy).toBe('created');
    expect(fs.existsSync(path.join(result.dir, 'SKILL.md'))).toBe(true);
  });

  it('imports from a tar.gz archive', async () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# Tar Skill');

    const archive = path.join(tmpDir, 'skill.tar.gz');
    await createTarGz(source, archive);

    const result = await importSkillFromArchive(archive, 'tar-skill', { skillsDir });
    expect(result.name).toBe('tar-skill');
    expect(result.strategy).toBe('created');
    expect(fs.existsSync(path.join(result.dir, 'SKILL.md'))).toBe(true);
  });

  it('rejects archives over 50MB', async () => {
    setup();
    const bigFile = path.join(tmpDir, 'big.zip');
    const fd = fs.openSync(bigFile, 'w');
    fs.ftruncateSync(fd, 51 * 1024 * 1024);
    fs.closeSync(fd);

    await expect(
      importSkillFromArchive(bigFile, 'big', { skillsDir }),
    ).rejects.toThrow('too large');
  });

  it('rejects unsupported formats', async () => {
    setup();
    const fake = path.join(tmpDir, 'skill.rar');
    fs.writeFileSync(fake, 'not a real archive');

    await expect(
      importSkillFromArchive(fake, 'fake', { skillsDir }),
    ).rejects.toThrow('Unsupported archive format');
  });

  it('rejects zip archives with symlink entries', async () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# Skill');
    fs.symlinkSync(path.join(source, 'SKILL.md'), path.join(source, 'link.md'));

    const archive = path.join(tmpDir, 'symlink.zip');
    await execFileAsync('zip', ['--symlinks', '-r', archive, '.'], { cwd: source });
    fs.rmSync(path.join(source, 'link.md'));

    await expect(
      importSkillFromArchive(archive, 'bad-symlink', { skillsDir }),
    ).rejects.toThrow('symbolic link');
  });

  it('rejects tar archives with symlink entries', async () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# Skill');
    fs.symlinkSync(path.join(source, 'SKILL.md'), path.join(source, 'link.md'));

    const archive = path.join(tmpDir, 'symlink.tar.gz');
    await createTarGz(source, archive);
    fs.rmSync(path.join(source, 'link.md'));

    await expect(
      importSkillFromArchive(archive, 'bad-symlink', { skillsDir }),
    ).rejects.toThrow('symbolic link');
  });

  it('handles duplicate strategies', async () => {
    setup();
    const source = path.join(tmpDir, 'src');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# V1');

    const archive = path.join(tmpDir, 'skill.zip');
    await createZip(source, archive);

    await importSkillFromArchive(archive, 'dup', { skillsDir });

    await expect(
      importSkillFromArchive(archive, 'dup', { skillsDir }),
    ).rejects.toThrow('already exists');

    const renamed = await importSkillFromArchive(archive, 'dup', {
      skillsDir,
      onDuplicate: 'rename',
    });
    expect(renamed.strategy).toBe('renamed');
    expect(renamed.name).toBe('dup-1');
  });
});
