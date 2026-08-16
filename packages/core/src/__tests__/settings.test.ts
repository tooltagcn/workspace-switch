import { describe, it, expect, afterEach } from 'vitest';
import { getDatabase } from '../db/index.js';
import { getSetting, setSetting } from '../settings.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('settings get/set', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  const openDb = () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-settings-test-'));
    tmpDirs.push(tmpDir);
    return getDatabase(tmpDir);
  };

  it('returns null for missing keys', () => {
    const db = openDb();
    expect(getSetting(db, 'theme')).toBeNull();
  });

  it('round-trips a value', () => {
    const db = openDb();
    setSetting(db, 'theme', 'dark');
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('upserts on repeated keys', () => {
    const db = openDb();
    setSetting(db, 'theme', 'light');
    setSetting(db, 'theme', 'system');
    expect(getSetting(db, 'theme')).toBe('system');
  });

  it('stores multiple independent keys', () => {
    const db = openDb();
    setSetting(db, 'theme', 'dark');
    setSetting(db, 'language', 'zh');
    expect(getSetting(db, 'theme')).toBe('dark');
    expect(getSetting(db, 'language')).toBe('zh');
  });
});
