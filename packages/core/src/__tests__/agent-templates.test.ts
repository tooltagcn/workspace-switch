import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import { loadTemplates, getTemplate } from '../agent/template-loader.js';
import { expandAgentPaths, resolveCandidateDirNames } from '../agent/expand-paths.js';
import { initBuiltinAgents } from '../agent/init-builtins.js';
import { listAgents, getAgent, updateAgent } from '../agent/registry.js';

describe('Agent templates', () => {
  it('loads 16 built-in templates', () => {
    const templates = loadTemplates();
    expect(templates).toHaveLength(16);
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
      'kiro-cli',
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

  it('creates all 16 builtin agents', () => {
    initBuiltinAgents(db, '/Users/test');
    const agents = listAgents(db);
    expect(agents).toHaveLength(16);
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
    expect(agents).toHaveLength(16);
  });

  it('preserves user-customized builtin fields on re-init', () => {
    initBuiltinAgents(db, '/Users/test');
    updateAgent(db, 'claude-code', {
      mcpFile: 'custom.json',
      mcpField: 'customField',
      skillDir: 'custom-skills',
      envTransform: 'bare',
    });

    initBuiltinAgents(db, '/Users/test');
    const agent = getAgent(db, 'claude-code')!;
    expect(agent.mcpFile).toBe('custom.json');
    expect(agent.mcpField).toBe('customField');
    expect(agent.skillDir).toBe('custom-skills');
    expect(agent.envTransform).toBe('bare');
  });

  it('migrates stale legacy defaults but not unrelated custom values', () => {
    initBuiltinAgents(db, '/Users/test');

    // Simulate an opencode row seeded from the OLD template version.
    updateAgent(db, 'opencode', {
      configDirName: '.opencode',
      userRoot: '/Users/test/.opencode',
      mcpFile: 'config.json',
      mcpField: 'mcpServers',
      envTransform: '${env:VAR}',
      fieldMapping: { command: 'command', args: 'args', url: 'url', env: 'env' },
    });
    // Add a customization unrelated to the legacy-declared fields.
    updateAgent(db, 'opencode', { skillDir: 'my-commands' });

    initBuiltinAgents(db, '/Users/test');
    const agent = getAgent(db, 'opencode')!;
    expect(agent.configDirName).toBe('.config/opencode');
    expect(agent.userRoot).toBe('/Users/test/.config/opencode');
    expect(agent.mcpFile).toBe('opencode.jsonc');
    expect(agent.mcpField).toBe('mcp');
    expect(agent.envTransform).toBe('{env:VAR}');
    expect(agent.fieldMapping).toEqual({
      command: 'command', args: 'args', url: 'url', env: 'environment',
    });
    expect(agent.skillDir).toBe('my-commands');
  });

  it('fills empty fields from the template on re-init', () => {
    initBuiltinAgents(db, '/Users/test');
    updateAgent(db, 'claude-code', { mcpFile: '' });

    initBuiltinAgents(db, '/Users/test');
    const agent = getAgent(db, 'claude-code')!;
    expect(agent.mcpFile).toBe('settings.json');
  });
});
