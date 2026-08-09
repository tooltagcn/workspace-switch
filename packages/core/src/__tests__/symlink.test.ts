import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { darwinSymlink } from '../sync/symlink-darwin.js';
import { checkBrokenSymlinks } from '../sync/check-broken.js';
import { getSymlinkImpl } from '../sync/symlink.js';

describe('Symlink Platform', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-symlink-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getSymlinkImpl returns an implementation', () => {
    const impl = getSymlinkImpl();
    expect(impl.platform).toBeDefined();
    expect(typeof impl.createSymlink).toBe('function');
  });

  describe('darwin symlink', () => {
    it('creates a symlink', () => {
      const target = path.join(tmpDir, 'target');
      const link = path.join(tmpDir, 'link');
      fs.mkdirSync(target);
      darwinSymlink.createSymlink(target, link);
      expect(darwinSymlink.isSymlink(link)).toBe(true);
    });

    it('reads a symlink target', () => {
      const target = path.join(tmpDir, 'target');
      const link = path.join(tmpDir, 'link');
      fs.mkdirSync(target);
      darwinSymlink.createSymlink(target, link);
      expect(darwinSymlink.readSymlink(link)).toBe(target);
    });

    it('removes a symlink', () => {
      const target = path.join(tmpDir, 'target');
      const link = path.join(tmpDir, 'link');
      fs.mkdirSync(target);
      darwinSymlink.createSymlink(target, link);
      expect(darwinSymlink.removeSymlink(link)).toBe(true);
      expect(fs.existsSync(link)).toBe(false);
    });

    it('returns false removing non-existent symlink', () => {
      expect(darwinSymlink.removeSymlink(path.join(tmpDir, 'nope'))).toBe(false);
    });

    it('throws creating symlink over regular file', () => {
      const filePath = path.join(tmpDir, 'file');
      fs.writeFileSync(filePath, 'data');
      expect(() => darwinSymlink.createSymlink(tmpDir, filePath)).toThrow('not a symlink');
    });

    it('replaces existing symlink', () => {
      const target1 = path.join(tmpDir, 'target1');
      const target2 = path.join(tmpDir, 'target2');
      const link = path.join(tmpDir, 'link');
      fs.mkdirSync(target1);
      fs.mkdirSync(target2);
      darwinSymlink.createSymlink(target1, link);
      darwinSymlink.createSymlink(target2, link);
      expect(darwinSymlink.readSymlink(link)).toBe(target2);
    });

    it('isSymlink returns false for regular file', () => {
      const filePath = path.join(tmpDir, 'file');
      fs.writeFileSync(filePath, 'data');
      expect(darwinSymlink.isSymlink(filePath)).toBe(false);
    });

    it('isSymlink returns false for non-existent path', () => {
      expect(darwinSymlink.isSymlink(path.join(tmpDir, 'nope'))).toBe(false);
    });

    it('readSymlink returns null for non-symlink', () => {
      const filePath = path.join(tmpDir, 'file');
      fs.writeFileSync(filePath, 'data');
      expect(darwinSymlink.readSymlink(filePath)).toBeNull();
    });
  });
});

describe('checkBrokenSymlinks', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-broken-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty for directory with no symlinks', () => {
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'data');
    expect(checkBrokenSymlinks(tmpDir)).toEqual([]);
  });

  it('detects broken symlinks', () => {
    const target = path.join(tmpDir, 'target');
    const link = path.join(tmpDir, 'link');
    fs.mkdirSync(target);
    fs.symlinkSync(target, link, 'dir');
    fs.rmdirSync(target);
    const broken = checkBrokenSymlinks(tmpDir);
    expect(broken).toHaveLength(1);
    expect(broken[0].linkPath).toBe(link);
  });

  it('returns empty for valid symlinks', () => {
    const target = path.join(tmpDir, 'target');
    const link = path.join(tmpDir, 'link');
    fs.mkdirSync(target);
    fs.symlinkSync(target, link, 'dir');
    expect(checkBrokenSymlinks(tmpDir)).toEqual([]);
  });

  it('returns empty for non-existent directory', () => {
    expect(checkBrokenSymlinks(path.join(tmpDir, 'nope'))).toEqual([]);
  });
});
