import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyWorkspaceIntegrity, computeChecksum, writeChecksum } from '../workspace/integrity.js';
import { initWorkspace } from '../workspace/init.js';

describe('Workspace Integrity', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-integrity-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports missing data directory', () => {
    const result = verifyWorkspaceIntegrity(path.join(tmpDir, 'nope'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes for initialized workspace', () => {
    initWorkspace(tmpDir);
    const result = verifyWorkspaceIntegrity(tmpDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('detects missing subdirectories', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills'));
    const result = verifyWorkspaceIntegrity(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('mcp'))).toBe(true);
  });

  it('detects empty database file', () => {
    initWorkspace(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'workspace.db'), '');
    const result = verifyWorkspaceIntegrity(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
  });

  it('computes checksum', () => {
    initWorkspace(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'skills', 'test.txt'), 'hello');
    const checksum = computeChecksum(tmpDir);
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('checksum changes when files change', () => {
    initWorkspace(tmpDir);
    const before = computeChecksum(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'skills', 'new.txt'), 'data');
    const after = computeChecksum(tmpDir);
    expect(before).not.toBe(after);
  });

  it('writeChecksum and verify match', () => {
    initWorkspace(tmpDir);
    writeChecksum(tmpDir);
    const result = verifyWorkspaceIntegrity(tmpDir);
    expect(result.valid).toBe(true);
  });

  it('detects checksum mismatch', () => {
    initWorkspace(tmpDir);
    writeChecksum(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'skills', 'changed.txt'), 'data');
    const result = verifyWorkspaceIntegrity(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Checksum mismatch'))).toBe(true);
  });
});
