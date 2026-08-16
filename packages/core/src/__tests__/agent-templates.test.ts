import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import { loadTemplates, getTemplate } from '../agent/template-loader.js';
import { expandAgentPaths, resolveCandidateDirNames } from '../agent/expand-paths.js';
import { initBuiltinAgents } from '../agent/init-builtins.js';
import { listAgents } from '../agent/registry.js';

describe('Agent templates', () => {
  it('loads 15 built-in templates', () => {
    const templates = loadTemplates();
    expect(templates).toHaveLength(15);
    const ids = templates.map((t) => t.id).sort();
    expect(ids).toEqual([
      'aider',
      'claude-code',
      'codebuddy',
      'codex',
      'copilot',
      'cursor',
      'droid',
      'factory',
      'gemini-cli',
      'hermes',
      'openclaude',
      'opencode',
      'qoder',
      'qoder-cn',
      'qwen-code',
    ]);
  });

  it('gets template by id', () => {
    const t = getTemplate('claude-code');
    expect(t).toBeDefined();
    expect(t!.name).toBe('Claude Code');
    expect(t!.configDirName).toBe('.claude');
  });

  it('codex has dual candidate dir names', () => {
    const t = getTemplate('codex');
    expect(t).toBeDefined();
    expect(t!.candidateDirNames).toEqual(['.agents', '.codex']);
  });
});

describe('expandAgentPaths', () => {
  it('expands user-level path', () => {
    const t = getTemplate('claude-code')!;
    const result = expandAgentPaths(t, '/Users/test');
    expect(result.userRoot).toBe('/Users/test/.claude');
    expect(result.projectRoot).toBeNull();
  });

  it('expands project-level path when projectRoot given', () => {
    const t = getTemplate('claude-code')!;
    const result = expandAgentPaths(t, '/Users/test', '/work/app');
    expect(result.userRoot).toBe('/Users/test/.claude');
    expect(result.projectRoot).toBe('/work/app/.claude');
  });

  it('uses configDirName from template', () => {
    const t = getTemplate('codex')!;
    const result = expandAgentPaths(t, '/home/user');
    expect(result.userRoot).toBe('/home/user/.agents');
  });
});

describe('resolveCandidateDirNames', () => {
  it('returns candidateDirNames for codex', () => {
    const t = getTemplate('codex')!;
    expect(resolveCandidateDirNames(t)).toEqual(['.agents', '.codex']);
  });

  it('returns single configDirName for claude-code', () => {
    const t = getTemplate('claude-code')!;
    expect(resolveCandidateDirNames(t)).toEqual(['.claude']);
  });
});

describe('initBuiltinAgents', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates all 15 builtin agents', () => {
    initBuiltinAgents(db, '/Users/test');
    const agents = listAgents(db);
    expect(agents).toHaveLength(15);
    for (const a of agents) {
      expect(a.builtin).toBe(true);
    }
  });

  it('sets correct userRoot paths', () => {
    initBuiltinAgents(db, '/Users/test');
    const agents = listAgents(db);
    const claude = agents.find((a) => a.id === 'claude-code');
    expect(claude!.userRoot).toBe('/Users/test/.claude');
  });

  it('is idempotent', () => {
    initBuiltinAgents(db, '/Users/test');
    initBuiltinAgents(db, '/Users/test');
    const agents = listAgents(db);
    expect(agents).toHaveLength(15);
  });
});
