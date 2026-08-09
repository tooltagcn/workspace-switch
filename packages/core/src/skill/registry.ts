import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SkillSearchResult {
  name: string;
  description: string;
  source: string;
}

export async function searchSkillsOnline(query: string): Promise<SkillSearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query must not be empty');
  }

  try {
    const { stdout } = await execFileAsync('npx', ['skills', 'search', query], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return parseSearchOutput(stdout);
  } catch (err: unknown) {
    if (isExecError(err) && err.code === 'ENOENT') {
      throw new Error('npx is not available. Install Node.js to use online skill search.');
    }
    if (isExecError(err) && err.killed) {
      throw new Error('Skill search timed out after 30 seconds');
    }
    throw new Error(`Skill search failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function parseSearchOutput(output: string): SkillSearchResult[] {
  const results: SkillSearchResult[] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

    const parts = trimmed.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      results.push({
        name: parts[0].trim(),
        description: parts[1]?.trim() ?? '',
        source: parts[2]?.trim() ?? '',
      });
    } else if (parts.length === 1 && parts[0].trim()) {
      results.push({
        name: parts[0].trim(),
        description: '',
        source: '',
      });
    }
  }

  return results;
}

function isExecError(err: unknown): err is NodeJS.ErrnoException & { killed?: boolean } {
  return err instanceof Error && ('code' in err || 'killed' in err);
}

export interface InstallFromRegistryOptions {
  skillsDir: string;
  skillName: string;
}

export interface InstallResult {
  name: string;
  dir: string;
}

export async function installSkillFromRegistry(
  options: InstallFromRegistryOptions,
): Promise<InstallResult> {
  const { skillsDir, skillName } = options;

  if (!skillName || skillName.trim().length === 0) {
    throw new Error('Skill name must not be empty');
  }

  const fs = await import('node:fs');
  const path = await import('node:path');

  fs.mkdirSync(skillsDir, { recursive: true });
  const destDir = path.join(skillsDir, skillName);

  try {
    await execFileAsync('npx', ['skills', 'install', skillName, '--dir', destDir], {
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err: unknown) {
    if (isExecError(err) && err.code === 'ENOENT') {
      throw new Error('npx is not available. Install Node.js to use online skill install.');
    }
    if (isExecError(err) && err.killed) {
      throw new Error('Skill install timed out after 60 seconds');
    }
    throw new Error(
      `Skill install failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { name: skillName, dir: destDir };
}
