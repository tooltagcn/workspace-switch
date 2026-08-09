import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { searchSkillsOnline, installSkillFromRegistry } from '../skill/registry.js';

vi.mock('node:child_process', () => {
  const actual = vi.importActual('node:child_process');
  return {
    ...actual,
    execFile: vi.fn(),
  };
});

describe('searchSkillsOnline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty queries', async () => {
    await expect(searchSkillsOnline('')).rejects.toThrow('must not be empty');
    await expect(searchSkillsOnline('  ')).rejects.toThrow('must not be empty');
  });

  it('parses search results from npx output', async () => {
    const mockOutput = `# Skills
react-hooks	A collection of React hooks skills	https://github.com/user/react-hooks
typescript-utils	TypeScript utility skills	https://github.com/user/ts-utils
`;

    const { execFile } = await import('node:child_process');
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: mockOutput, stderr: '' });
      }) as any,
    );

    const results = await searchSkillsOnline('react');
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('react-hooks');
    expect(results[0].description).toBe('A collection of React hooks skills');
    expect(results[1].name).toBe('typescript-utils');
  });

  it('handles npx not available', async () => {
    const { execFile } = await import('node:child_process');
    const mockExecFile = vi.mocked(execFile);
    const err = new Error('spawn npx ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockExecFile.mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(err);
      }) as any,
    );

    await expect(searchSkillsOnline('test')).rejects.toThrow('npx is not available');
  });

  it('handles timeout', async () => {
    const { execFile } = await import('node:child_process');
    const mockExecFile = vi.mocked(execFile);
    const err = new Error('timeout') as NodeJS.ErrnoException & { killed: boolean };
    err.killed = true;
    mockExecFile.mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(err);
      }) as any,
    );

    await expect(searchSkillsOnline('test')).rejects.toThrow('timed out');
  });

  it('returns empty array for empty output', async () => {
    const { execFile } = await import('node:child_process');
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: '', stderr: '' });
      }) as any,
    );

    const results = await searchSkillsOnline('nonexistent');
    expect(results).toEqual([]);
  });
});

describe('installSkillFromRegistry', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-install-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('calls npx skills install with correct args', async () => {
    const { execFile } = await import('node:child_process');
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: '', stderr: '' });
      }) as any,
    );

    const skillsDir = path.join(tmpDir, 'skills');
    const result = await installSkillFromRegistry({
      skillsDir,
      skillName: 'my-skill',
    });

    expect(result.name).toBe('my-skill');
    expect(mockExecFile).toHaveBeenCalledWith(
      'npx',
      ['skills', 'install', 'my-skill', '--dir', expect.any(String)],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('rejects empty skill name', async () => {
    await expect(
      installSkillFromRegistry({ skillsDir: tmpDir, skillName: '' }),
    ).rejects.toThrow('must not be empty');
  });

  it('handles npx not available', async () => {
    const { execFile } = await import('node:child_process');
    const mockExecFile = vi.mocked(execFile);
    const err = new Error('spawn npx ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockExecFile.mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(err);
      }) as any,
    );

    await expect(
      installSkillFromRegistry({ skillsDir: tmpDir, skillName: 'test' }),
    ).rejects.toThrow('npx is not available');
  });
});
