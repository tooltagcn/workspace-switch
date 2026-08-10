import { execFile, spawn } from 'node:child_process';
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
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
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

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
const BOX_RE = /[█▀▄▌▐╔╗╚╝╠╣╦╩╬═║─┌┐└┘├┤┬┴┼│━┏┓┗┛┣┫┳┻╋╔╚]/;
const INSTALL_COUNT_RE = /\s*[\d,.]+\s*[KMB]?\s*installs?\s*/gi;
const HEADER_WORDS = new Set(['name', 'names', 'description', 'installs', 'source', 'package']);

function isValidSkillName(name: string): boolean {
  return /^[@\w][\w./@:-]*$/.test(name);
}

function parseSearchOutput(output: string): SkillSearchResult[] {
  const results: SkillSearchResult[] = [];
  const lines = output.trim().split('\n');

  let i = 0;
  while (i < lines.length) {
    const cleaned = lines[i].replace(ANSI_RE, '').trim();
    i++;

    if (!cleaned || BOX_RE.test(cleaned)) continue;
    if (/^[-+]+$/.test(cleaned)) continue;
    if (cleaned.startsWith('#') || cleaned.startsWith('-')) continue;
    if (cleaned.startsWith('└') || cleaned.startsWith('└')) continue;
    if (cleaned.startsWith('Install with')) continue;

    if (cleaned.includes('|')) {
      const parts = cleaned
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (parts.length === 0) continue;
      if (parts.every((p) => HEADER_WORDS.has(p.toLowerCase()))) continue;

      const name = parts[0].replace(INSTALL_COUNT_RE, '').trim();
      if (!name || !isValidSkillName(name)) continue;
      const description = (parts[1] ?? '').replace(INSTALL_COUNT_RE, '').trim();
      const source = (parts[2] ?? '').trim();
      results.push({ name, description, source });
      continue;
    }

    const tabParts = cleaned.split(/\t+/).map((p) => p.trim()).filter((p) => p);
    if (tabParts.length >= 2) {
      if (tabParts.every((p) => HEADER_WORDS.has(p.toLowerCase()))) continue;
      const name = tabParts[0].replace(INSTALL_COUNT_RE, '').trim();
      if (!name || !isValidSkillName(name)) continue;
      const description = (tabParts[1] ?? '').replace(INSTALL_COUNT_RE, '').trim();
      const source = (tabParts[2] ?? '').trim();
      results.push({ name, description, source });
      continue;
    }

    const nameMatch = cleaned.match(/^(\S+)\s+([\d,.]+\s*[KMB]?\s*installs?)?$/i);
    if (nameMatch) {
      const name = nameMatch[1];
      if (!isValidSkillName(name)) continue;

      let source = '';
      while (i < lines.length) {
        const nextLine = lines[i].replace(ANSI_RE, '').trim();
        if (nextLine.startsWith('└') || nextLine.startsWith('└')) {
          source = nextLine.replace(/^[└└]\s*/, '').trim();
          i++;
          break;
        }
        if (!nextLine || BOX_RE.test(nextLine) || nextLine.startsWith('#')) {
          break;
        }
        i++;
      }

      results.push({ name, description: '', source });
      continue;
    }

    const multiSpaceParts = cleaned.split(/\s{2,}/).map((p) => p.trim()).filter((p) => p);
    if (multiSpaceParts.length >= 2) {
      if (multiSpaceParts.every((p) => HEADER_WORDS.has(p.toLowerCase()))) continue;
      const name = multiSpaceParts[0].replace(INSTALL_COUNT_RE, '').trim();
      if (!name || !isValidSkillName(name)) continue;
      const description = (multiSpaceParts[1] ?? '').replace(INSTALL_COUNT_RE, '').trim();
      const source = (multiSpaceParts[2] ?? '').trim();
      results.push({ name, description, source });
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

function runWithOutput(
  cmd: string,
  args: string[],
  opts: { timeout: number; env?: NodeJS.ProcessEnv },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: opts.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      const err = new Error('Command timed out') as NodeJS.ErrnoException & {
        killed?: boolean;
        stdout?: string;
        stderr?: string;
      };
      err.killed = true;
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    }, opts.timeout);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      process.stdout.write(`[skill-install:stdout] ${d}`);
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      process.stderr.write(`[skill-install:stderr] ${d}`);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      (err as any).stdout = stdout;
      (err as any).stderr = stderr;
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`Command exited with code ${code}`) as any;
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      }
    });
  });
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
  const os = await import('node:os');

  fs.mkdirSync(skillsDir, { recursive: true });

  const actualName = skillName.includes('@')
    ? skillName.split('@').pop()!
    : skillName.split('/').pop()!;
  const destDir = path.join(skillsDir, actualName);
  const agentSkillsDir = path.join(os.homedir(), '.agents', 'skills', actualName);

  try {
    const output = await runWithOutput(
      'npx',
      ['--yes', 'skills', 'add', skillName, '--all', '-g', '-y'],
      {
        timeout: 120_000,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      },
    );
    if (output.stdout) console.log('[skill-install]', output.stdout);
    if (output.stderr) console.error('[skill-install]', output.stderr);
  } catch (err: unknown) {
    if (isExecError(err) && err.code === 'ENOENT') {
      throw new Error('npx is not available. Install Node.js to use online skill install.');
    }
    if (isExecError(err) && err.killed) {
      throw new Error('Skill install timed out after 120 seconds');
    }
    const detail =
      err instanceof Error && 'stdout' in err
        ? `\nstdout: ${(err as any).stdout}\nstderr: ${(err as any).stderr}`
        : '';
    throw new Error(
      `Skill install failed: ${err instanceof Error ? err.message : String(err)}${detail}`,
    );
  }

  if (!fs.existsSync(agentSkillsDir)) {
    throw new Error(
      `Skill install succeeded but files not found at ${agentSkillsDir}`,
    );
  }

  fs.cpSync(agentSkillsDir, destDir, { recursive: true });

  return { name: actualName, dir: destDir };
}
