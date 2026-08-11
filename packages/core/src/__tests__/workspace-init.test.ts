import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initWorkspace } from '../workspace/init.js';

describe('initWorkspace', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates dataDir and all subdirectories on first call', () => {
    tmpDir = path.join(os.tmpdir(), `ws-test-${Date.now()}`);
    const result = initWorkspace(tmpDir);

    expect(result.dataDir).toBe(tmpDir);
    expect(result.created).toHaveLength(4);
    expect(result.existing).toHaveLength(0);

    expect(fs.existsSync(path.join(tmpDir, 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'mcp'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'providers'))).toBe(true);
  });

  it('is idempotent on second call', () => {
    tmpDir = path.join(os.tmpdir(), `ws-test-${Date.now()}`);
    initWorkspace(tmpDir);

    const result2 = initWorkspace(tmpDir);
    expect(result2.created).toHaveLength(0);
    expect(result2.existing).toHaveLength(4);
  });

  it('handles partially existing directories', () => {
    tmpDir = path.join(os.tmpdir(), `ws-test-${Date.now()}`);
    fs.mkdirSync(path.join(tmpDir, 'skills'), { recursive: true });

    const result = initWorkspace(tmpDir);
    expect(result.created).toHaveLength(3);
    expect(result.existing).toHaveLength(1);
    expect(result.existing[0]).toContain('skills');
  });
});
