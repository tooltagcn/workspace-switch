import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type OnDuplicate = 'error' | 'overwrite' | 'rename';

export interface ImportOptions {
  skillsDir: string;
  onDuplicate?: OnDuplicate;
}

export interface ImportResult {
  name: string;
  dir: string;
  strategy: 'created' | 'overwritten' | 'renamed';
}

function ensureUniqueName(skillsDir: string, baseName: string): string {
  let candidate = baseName;
  let counter = 1;
  while (fs.existsSync(path.join(skillsDir, candidate))) {
    candidate = `${baseName}-${counter}`;
    counter++;
  }
  return candidate;
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links not allowed in skill import: ${entry.name}`);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function handleDuplicate(
  skillsDir: string,
  name: string,
  onDuplicate: OnDuplicate,
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
      const newName = ensureUniqueName(skillsDir, name);
      return { finalName: newName, strategy: 'renamed' };
    }
  }
}

export function importSkillFromLocal(
  sourcePath: string,
  name: string,
  options: ImportOptions,
): ImportResult {
  const { skillsDir, onDuplicate = 'error' } = options;
  const resolvedSource = path.resolve(sourcePath);

  if (!fs.existsSync(resolvedSource) || !fs.statSync(resolvedSource).isDirectory()) {
    throw new Error(`Source path is not a valid directory: ${resolvedSource}`);
  }

  fs.mkdirSync(skillsDir, { recursive: true });
  const { finalName, strategy } = handleDuplicate(skillsDir, name, onDuplicate);
  const destDir = path.join(skillsDir, finalName);

  copyDirSync(resolvedSource, destDir);

  return { name: finalName, dir: destDir, strategy };
}

export function normalizeGitUrl(source: string): string {
  if (/^[\w.-]+\/[\w.-]+\.git$/.test(source)) {
    return `https://github.com/${source}`;
  }
  if (/^[\w.-]+\/[\w.-]+$/.test(source)) {
    return `https://github.com/${source}.git`;
  }
  return source;
}

export async function importSkillFromGit(
  source: string,
  name: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const { skillsDir, onDuplicate = 'error' } = options;
  const gitUrl = normalizeGitUrl(source);

  fs.mkdirSync(skillsDir, { recursive: true });
  const { finalName, strategy } = handleDuplicate(skillsDir, name, onDuplicate);
  const destDir = path.join(skillsDir, finalName);

  await execFileAsync('git', ['clone', '--depth', '1', gitUrl, destDir], {
    timeout: 60_000,
  });

  fs.rmSync(path.join(destDir, '.git'), { recursive: true, force: true });

  return { name: finalName, dir: destDir, strategy };
}
