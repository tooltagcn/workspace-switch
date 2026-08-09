import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../db/migrate.js';
import { applyMcpToAgent, previewMcpApply } from '../mcp/apply.js';
import { createMcp } from '../mcp/manager.js';
import type { AgentTemplate } from '../agent/template-types.js';
import type { McpServer } from '../mcp/types.js';

const claudeTemplate: AgentTemplate = {
  id: 'claude-code',
  name: 'Claude Code',
  configDirName: '.claude',
  mcpFile: 'settings.json',
  mcpField: 'mcpServers',
  skillDir: 'commands',
  icon: 'claude',
  targetFormat: 'json-map',
};

describe('applyMcpToAgent', () => {
  let db: Database.Database;
  let tmpDir: string;
  let agentDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);

    db.prepare(
      `INSERT INTO agent (id, name, builtin, config_dir_name, enabled) VALUES (?, ?, 0, ?, 1)`,
    ).run('claude-code', 'Claude Code', '.claude');

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-mcp-apply-'));
    agentDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(agentDir, { recursive: true });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeMcpServer(overrides: Partial<McpServer> = {}): McpServer {
    return {
      id: 'test-id',
      name: 'test-server',
      transport: 'stdio',
      command: 'npx',
      url: null,
      args: ['mcp-server'],
      env: {},
      description: null,
      tags: [],
      testStatus: 'untested',
      testError: null,
      testedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it('merge mode: creates new file when none exists', () => {
    const mcp = makeMcpServer();
    const result = applyMcpToAgent(db, {
      agentId: 'claude-code',
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
      mode: 'merge',
    });

    expect(result.before).toBeNull();
    const written = JSON.parse(result.after);
    expect(written.mcpServers['test-server']).toBeDefined();
    expect(written.mcpServers['test-server'].command).toBe('npx');
  });

  it('merge mode: preserves non-MCP content', () => {
    const existing = { theme: 'dark', mcpServers: { old: { command: 'old' } } };
    fs.writeFileSync(path.join(agentDir, 'settings.json'), JSON.stringify(existing));

    const mcp = makeMcpServer();
    const result = applyMcpToAgent(db, {
      agentId: 'claude-code',
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
      mode: 'merge',
    });

    const written = JSON.parse(result.after);
    expect(written.theme).toBe('dark');
    expect(written.mcpServers['old']).toBeDefined();
    expect(written.mcpServers['test-server']).toBeDefined();
  });

  it('strict mode: replaces MCP section entirely', () => {
    const existing = { theme: 'dark', mcpServers: { old: { command: 'old' } } };
    fs.writeFileSync(path.join(agentDir, 'settings.json'), JSON.stringify(existing));

    const mcp = makeMcpServer();
    const result = applyMcpToAgent(db, {
      agentId: 'claude-code',
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
      mode: 'strict',
    });

    const written = JSON.parse(result.after);
    expect(written.theme).toBe('dark');
    expect(written.mcpServers['old']).toBeUndefined();
    expect(written.mcpServers['test-server']).toBeDefined();
  });

  it('throws when template has no MCP support', () => {
    const noMcpTemplate: AgentTemplate = {
      ...claudeTemplate,
      mcpFile: null,
      mcpField: null,
    };
    expect(() =>
      applyMcpToAgent(db, {
        agentId: 'claude-code',
        agentConfigDir: agentDir,
        template: noMcpTemplate,
        mcps: [makeMcpServer()],
        mode: 'merge',
      }),
    ).toThrow('does not support MCP');
  });

  it('records resource_agent in DB', () => {
    const mcp = createMcp(db, { name: 'db-test', transport: 'stdio', command: 'cmd' });
    applyMcpToAgent(db, {
      agentId: 'claude-code',
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
      mode: 'merge',
    });

    const row = db
      .prepare(
        `SELECT * FROM resource_agent WHERE resource_type = 'mcp' AND agent_id = ?`,
      )
      .get('claude-code') as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
  });

  it('atomic write: file is written correctly', () => {
    const mcp = makeMcpServer();
    applyMcpToAgent(db, {
      agentId: 'claude-code',
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
      mode: 'merge',
    });

    const filePath = path.join(agentDir, 'settings.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.mcpServers['test-server']).toBeDefined();
  });

  it('rollback: throws when write fails', () => {
    const failTemplate: AgentTemplate = {
      ...claudeTemplate,
      mcpFile: 'nonexistent-dir/settings.json',
    };

    const mcp = makeMcpServer();
    expect(() =>
      applyMcpToAgent(db, {
        agentId: 'claude-code',
        agentConfigDir: agentDir,
        template: failTemplate,
        mcps: [mcp],
        mode: 'merge',
      }),
    ).toThrow();
  });
});

describe('previewMcpApply', () => {
  let tmpDir: string;
  let agentDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-mcp-preview-'));
    agentDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(agentDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeMcpServer(overrides: Partial<McpServer> = {}): McpServer {
    return {
      id: 'test-id',
      name: 'test-server',
      transport: 'stdio',
      command: 'npx',
      url: null,
      args: ['mcp-server'],
      env: {},
      description: null,
      tags: [],
      testStatus: 'untested',
      testError: null,
      testedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it('returns before, after, and diff without writing to disk', () => {
    const mcp = makeMcpServer();
    const result = previewMcpApply({
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
    });

    expect(result.before).toBeNull();
    expect(result.after).toContain('test-server');
    expect(result.diff).toContain('---');
    expect(result.diff).toContain('+++');
    expect(result.diff).toContain('+');

    const filePath = path.join(agentDir, 'settings.json');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('shows diff when existing file exists', () => {
    const existing = { theme: 'dark', mcpServers: {} };
    fs.writeFileSync(path.join(agentDir, 'settings.json'), JSON.stringify(existing, null, 2) + '\n');

    const mcp = makeMcpServer();
    const result = previewMcpApply({
      agentConfigDir: agentDir,
      template: claudeTemplate,
      mcps: [mcp],
    });

    expect(result.before).not.toBeNull();
    expect(result.diff).toContain('-');
    expect(result.diff).toContain('+');
  });

  it('throws when template has no MCP support', () => {
    const noMcpTemplate: AgentTemplate = {
      ...claudeTemplate,
      mcpFile: null,
      mcpField: null,
    };
    expect(() =>
      previewMcpApply({
        agentConfigDir: agentDir,
        template: noMcpTemplate,
        mcps: [makeMcpServer()],
      }),
    ).toThrow('does not support MCP');
  });
});
