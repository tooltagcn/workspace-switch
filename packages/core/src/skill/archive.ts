import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ImportOptions, ImportResult } from './import.js';

const execFileAsync = promisify(execFile);

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;

function detectArchiveType(filePath: string): '.zip' | '.tar.gz' | '.tar' | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return '.tar.gz';
  if (lower.endsWith('.tar')) return '.tar';
  if (lower.endsWith('.zip')) return '.zip';
  return null;
}

function checkFileSize(filePath: string): void {
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_ARCHIVE_SIZE) {
    throw new Error(
      `Archive too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB exceeds 50MB limit`,
    );
  }
}

function validateNoZipSlip(targetDir: string): void {
  const resolved = fs.realpathSync(targetDir);
  const check = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const realPath = fs.realpathSync(fullPath);
      if (!realPath.startsWith(resolved + path.sep) && realPath !== resolved) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        throw new Error(`Zip Slip detected: ${entry.name} resolves outside target directory`);
      }
      if (entry.isDirectory()) {
        check(fullPath);
      }
    }
  };
  check(targetDir);
}

async function checkTarForSymlinks(filePath: string): Promise<void> {
  const { stdout } = await execFileAsync('tar', ['tvf', filePath], {
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue;
    if (line.startsWith('l') || line.includes(' -> ')) {
      throw new Error(`Archive contains symbolic link entry: ${line.trim()}`);
    }
  }
}

async function checkZipForSymlinks(filePath: string): Promise<void> {
  const { stdout: verbose } = await execFileAsync('zipinfo', [filePath], {
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  for (const line of verbose.split('\n')) {
    if (line.trim() === '') continue;
    const perms = line.charAt(0);
    if (perms === 'l') {
      throw new Error(`Archive contains symbolic link entry: ${line.trim()}`);
    }
  }
}

function handleDuplicate(
  skillsDir: string,
  name: string,
  onDuplicate: string,
): { finalName: string; strategy: ImportResult['strategy'] } {
  const target = path.join(skillsDir, name);
  if (!fs.existsSync(target)) {
    return { finalName: name, strategy: 'created' };
  }

  switch (onDuplicate) {
    case 'error':
      throw new Error(`Skill "${name}" already exists in ${skillsDir}`);
    case 'overwrite':
      fs.rmSync(target, { recursive: true, force: true });
      return { finalName: name, strategy: 'overwritten' };
    case 'rename': {
      let candidate = name;
      let counter = 1;
      while (fs.existsSync(path.join(skillsDir, candidate))) {
        candidate = `${name}-${counter}`;
        counter++;
      }
      return { finalName: candidate, strategy: 'renamed' };
    }
    default:
      throw new Error(`Unknown onDuplicate strategy: ${onDuplicate}`);
  }
}

export async function importSkillFromArchive(
  archivePath: string,
  name: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const { skillsDir, onDuplicate = 'error' } = options;
  const resolved = path.resolve(archivePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Archive not found: ${resolved}`);
  }

  const archiveType = detectArchiveType(resolved);
  if (!archiveType) {
    throw new Error(`Unsupported archive format: ${resolved}. Supported: .zip, .tar.gz, .tar`);
  }

  checkFileSize(resolved);

  fs.mkdirSync(skillsDir, { recursive: true });
  const { finalName, strategy } = handleDuplicate(skillsDir, name, onDuplicate);
  const destDir = path.join(skillsDir, finalName);
  fs.mkdirSync(destDir, { recursive: true });

  if (archiveType === '.tar.gz' || archiveType === '.tar') {
    await checkTarForSymlinks(resolved);
    const flag = archiveType === '.tar.gz' ? 'xzf' : 'xf';
    await execFileAsync('tar', [flag, resolved, '-C', destDir], {
      timeout: 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });
  } else {
    await checkZipForSymlinks(resolved);
    await execFileAsync('unzip', ['-o', resolved, '-d', destDir], {
      timeout: 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });
  }

  validateNoZipSlip(destDir);

  return { name: finalName, dir: destDir, strategy };
}
