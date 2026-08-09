import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateTargetPath, PathValidationError } from '../security/path-validator.js';

describe('validateTargetPath', () => {
  let tmpDir: string;
  let allowedDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-path-'));
    allowedDir = path.join(tmpDir, 'allowed');
    fs.mkdirSync(allowedDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('allows a path within the allowed directory', () => {
    const target = path.join(allowedDir, 'file.txt');
    fs.writeFileSync(target, 'test');

    const result = validateTargetPath(target, [allowedDir]);
    expect(result).toBe(fs.realpathSync(path.join(allowedDir, 'file.txt')));
  });

  it('allows the allowed directory itself', () => {
    const result = validateTargetPath(allowedDir, [allowedDir]);
    expect(result).toBe(fs.realpathSync(allowedDir));
  });

  it('rejects path outside allowed directory', () => {
    const outside = path.join(tmpDir, 'outside.txt');
    fs.writeFileSync(outside, 'test');

    expect(() => validateTargetPath(outside, [allowedDir])).toThrow(PathValidationError);
  });

  it('rejects ../ traversal attempt', () => {
    const inner = path.join(allowedDir, 'inner');
    fs.mkdirSync(inner);
    const traversal = path.join(inner, '..', '..', 'outside.txt');
    fs.writeFileSync(path.join(tmpDir, 'outside.txt'), 'test');

    expect(() => validateTargetPath(traversal, [allowedDir])).toThrow(PathValidationError);
  });

  it('rejects when path does not exist', () => {
    const nonExistent = path.join(allowedDir, 'does-not-exist');
    expect(() => validateTargetPath(nonExistent, [allowedDir])).toThrow(PathValidationError);
  });

  it('allows intermediate symlink', () => {
    const realSubDir = path.join(tmpDir, 'real-dir');
    fs.mkdirSync(realSubDir);
    const target = path.join(realSubDir, 'file.txt');
    fs.writeFileSync(target, 'test');

    const symlinkPath = path.join(allowedDir, 'link');
    fs.symlinkSync(realSubDir, symlinkPath, 'dir');

    const targetViaLink = path.join(symlinkPath, 'file.txt');
    const result = validateTargetPath(targetViaLink, [allowedDir, realSubDir]);
    expect(result).toBeDefined();
  });

  it('rejects when no allowed dirs provided', () => {
    const target = path.join(allowedDir, 'file.txt');
    fs.writeFileSync(target, 'test');

    expect(() => validateTargetPath(target, [])).toThrow(PathValidationError);
  });

  it('supports multiple allowed directories', () => {
    const secondDir = path.join(tmpDir, 'second');
    fs.mkdirSync(secondDir);
    const target = path.join(secondDir, 'file.txt');
    fs.writeFileSync(target, 'test');

    const result = validateTargetPath(target, [allowedDir, secondDir]);
    expect(result).toBe(fs.realpathSync(path.join(secondDir, 'file.txt')));
  });
});
