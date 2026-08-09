import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { migrate } from '../db/migrate.js';
import { initBuiltinAgents } from '../agent/init-builtins.js';
import { detectAgents } from '../agent/detect.js';
import { getAgent } from '../agent/registry.js';

describe('Agent auto-detection', () => {
  let db: Database.Database;
  let tmpHome: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-detect-'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('detects agent when directory exists', () => {
    fs.mkdirSync(path.join(tmpHome, '.claude'));
    initBuiltinAgents(db, tmpHome);

    const results = detectAgents(db);
    const claude = results.find((r) => r.agentId === 'claude-code');
    expect(claude!.detected).toBe(true);
    expect(claude!.detectedDir).toBe(path.join(tmpHome, '.claude'));
  });

  it('does not detect when directory is absent', () => {
    initBuiltinAgents(db, tmpHome);

    const results = detectAgents(db);
    const claude = results.find((r) => r.agentId === 'claude-code');
    expect(claude!.detected).toBe(false);
    expect(claude!.detectedDir).toBeNull();
  });

  it('detects codex via .agents candidate', () => {
    fs.mkdirSync(path.join(tmpHome, '.agents'));
    initBuiltinAgents(db, tmpHome);

    const results = detectAgents(db);
    const codex = results.find((r) => r.agentId === 'codex');
    expect(codex!.detected).toBe(true);
    expect(codex!.detectedDir).toBe(path.join(tmpHome, '.agents'));
  });

  it('detects codex via .codex fallback candidate', () => {
    fs.mkdirSync(path.join(tmpHome, '.codex'));
    initBuiltinAgents(db, tmpHome);

    const results = detectAgents(db);
    const codex = results.find((r) => r.agentId === 'codex');
    expect(codex!.detected).toBe(true);
    expect(codex!.detectedDir).toBe(path.join(tmpHome, '.codex'));
  });

  it('prefers first candidate for codex', () => {
    fs.mkdirSync(path.join(tmpHome, '.agents'));
    fs.mkdirSync(path.join(tmpHome, '.codex'));
    initBuiltinAgents(db, tmpHome);

    const results = detectAgents(db);
    const codex = results.find((r) => r.agentId === 'codex');
    expect(codex!.detectedDir).toBe(path.join(tmpHome, '.agents'));
  });

  it('updates detectedAt on detection', () => {
    fs.mkdirSync(path.join(tmpHome, '.claude'));
    initBuiltinAgents(db, tmpHome);

    const before = getAgent(db, 'claude-code');
    expect(before!.detectedAt).toBeNull();

    detectAgents(db);
    const after = getAgent(db, 'claude-code');
    expect(after!.detectedAt).not.toBeNull();
  });
});
