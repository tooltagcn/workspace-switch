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
    spawn: vi.fn(),
  };
});

let mockHome = '';
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: () => mockHome,
  };
});

function createFakeChild() {
  const child: any = {
    stdout: { on: (_e: string, cb: Function) => { child._onStdout = cb; } },
    stderr: { on: (_e: string, cb: Function) => { child._onStderr = cb; } },
    kill: vi.fn(),
    _handlers: {} as Record<string, Function>,
    on(event: string, cb: Function) { child._handlers[event] = cb; },
    emitStdout(d: string) { child._onStdout?.(d); },
    emitStderr(d: string) { child._onStderr?.(d); },
    emitClose(code: number) { child._handlers.close?.(code); },
    emitError(err: Error) { child._handlers.error?.(err); },
  };
  return child;
}

describe('searchSkillsOnline', () => {
  let fakeChild: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    fakeChild = createFakeChild();
    const { spawn } = await import('node:child_process');
    vi.mocked(spawn).mockReturnValue(fakeChild);
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
    const promise = searchSkillsOnline('react');
    fakeChild.emitStdout(mockOutput);
    fakeChild.emitClose(0);

    const results = await promise;
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('react-hooks');
    expect(results[0].description).toBe('A collection of React hooks skills');
    expect(results[1].name).toBe('typescript-utils');
  });

  it('handles npx not available', async () => {
    const err = new Error('spawn npx ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    const promise = searchSkillsOnline('test');
    fakeChild.emitError(err);

    await expect(promise).rejects.toThrow('npx is not available');
  });

  it('handles timeout', async () => {
    vi.useFakeTimers();
    const promise = searchSkillsOnline('test');
    vi.advanceTimersByTime(60_000);
    await expect(promise).rejects.toThrow('timed out');
    vi.useRealTimers();
  });

  it('returns empty array for empty output', async () => {
    const promise = searchSkillsOnline('nonexistent');
    fakeChild.emitStdout('');
    fakeChild.emitClose(0);

    const results = await promise;
    expect(results).toEqual([]);
  });
});

describe('installSkillFromRegistry', () => {
  let tmpDir: string;
  let fakeChild: any;
  let spawned: Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-install-'));
    mockHome = tmpDir;
    fakeChild = createFakeChild();
    const { spawn } = await import('node:child_process');
    let resolveSpawned!: () => void;
    spawned = new Promise((r) => { resolveSpawned = r; });
    vi.mocked(spawn).mockImplementation((..._args: any[]) => {
      resolveSpawned();
      return fakeChild;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects empty skill name', async () => {
    await expect(
      installSkillFromRegistry({ skillsDir: tmpDir, skillName: '' }),
    ).rejects.toThrow('must not be empty');
  });

  it('calls npx skills add with correct args and copies files', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const actualName = 'my-skill';
    const agentSkillsDir = path.join(mockHome, '.agents', 'skills', actualName);
    fs.mkdirSync(agentSkillsDir, { recursive: true });

    const promise = installSkillFromRegistry({ skillsDir, skillName: actualName });
    await spawned;
    fakeChild.emitClose(0);
    const result = await promise;

    expect(result.name).toBe(actualName);
    const { spawn } = await import('node:child_process');
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      'npx',
      ['--yes', 'skills', 'add', actualName, '--all', '-g', '-y'],
      expect.any(Object),
    );
    expect(fs.existsSync(path.join(skillsDir, actualName))).toBe(true);
  });

  it('handles npx not available', async () => {
    const err = new Error('spawn npx ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    const promise = installSkillFromRegistry({ skillsDir: tmpDir, skillName: 'test' });
    await spawned;
    fakeChild.emitError(err);

    await expect(promise).rejects.toThrow('npx is not available');
  });
});
