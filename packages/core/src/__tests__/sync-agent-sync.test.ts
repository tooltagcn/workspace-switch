import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../db/migrate.js';
import { createAgent } from '../agent/registry.js';
import { createSkill } from '../skill/manager.js';
import { createMcp } from '../mcp/manager.js';
import { saveMcpToWorkspace } from '../mcp/storage.js';
import { syncSkillToWorkspace, syncMcpToWorkspace, syncAgentAll } from '../sync/agent-sync.js';
import type { Agent } from '../agent/types.js';
import type { AgentTemplate } from '../agent/template-types.js';
import type { SymlinkPlatform } from '../sync/platform.js';

function createMockSymlink(): SymlinkPlatform & { links: Map<string, string> } {
  const links = new Map<string, string>();
  return {
    platform: 'test',
    links,
    createSymlink(target: string, linkPath: string) {
      if (fs.existsSync(linkPath)) {
        const stat = fs.lstatSync(linkPath);
        if (stat.isSymbolicLink()) fs.unlinkSync(linkPath);
        else if (stat.isDirectory()) fs.rmSync(linkPath, { recursive: true, force: true });
        else fs.unlinkSync(linkPath);
      }
      fs.mkdirSync(linkPath, { recursive: true });
      links.set(linkPath, target);
    },
    removeSymlink(linkPath: string) {
      if (!fs.existsSync(linkPath)) return false;
      fs.rmSync(linkPath, { recursive: true, force: true });
      links.delete(linkPath);
      return true;
    },
    isSymlink(filePath: string) {
      return links.has(filePath);
    },
    readSymlink(linkPath: string) {
      return links.get(linkPath) ?? null;
    },
  };
}

describe('Agent Sync', () => {
  let db: Database.Database;
  let tmpDir: string;
  let workspaceDir: string;
  let agent: Agent;
  let agentDir: string;
  const template: AgentTemplate = {
    id: 'test-agent',
    name: 'Test Agent',
    configDirName: '.test-agent',
    mcpFile: 'settings.json',
    mcpField: 'mcpServers',
    skillDir: 'skills',
    icon: null,
    targetFormat: 'json-map',
  };

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-agent-sync-'));
    workspaceDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(workspaceDir, { recursive: true });

    agentDir = path.join(tmpDir, 'agent-config');
    fs.mkdirSync(agentDir, { recursive: true });

    agent = createAgent(db, {
      id: 'test-agent',
      name: 'Test Agent',
      configDirName: '.test-agent',
      userRoot: agentDir,
      skillDir: 'skills',
      mcpFile: 'settings.json',
      mcpField: 'mcpServers',
      enabled: true,
    });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('syncSkillToWorkspace', () => {
    it('creates symlink from agent dir to workspace trusted source', () => {
      const trustedSource = path.join(workspaceDir, 'skills', 'my-skill');
      fs.mkdirSync(trustedSource, { recursive: true });
      fs.writeFileSync(path.join(trustedSource, 'SKILL.md'), 'skill content');

      const agentSkillDir = path.join(agentDir, 'skills');
      fs.mkdirSync(agentSkillDir, { recursive: true });
      const agentLocalPath = path.join(agentSkillDir, 'my-skill');
      fs.mkdirSync(agentLocalPath);
      fs.writeFileSync(path.join(agentLocalPath, 'SKILL.md'), 'old content');

      const skill = createSkill(db, { name: 'my-skill', sourcePath: trustedSource });
      db.prepare(
        "INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked) VALUES ('skill', ?, ?, 0)",
      ).run(skill.id, agent.id);

      const symlink = createMockSymlink();
      const result = syncSkillToWorkspace(db, agent, 'my-skill', workspaceDir, symlink);

      expect(result.success).toBe(true);
      expect(symlink.links.has(agentLocalPath)).toBe(true);
      expect(symlink.links.get(agentLocalPath)).toBe(trustedSource);
    });

    it('returns error when trusted source not found', () => {
      const symlink = createMockSymlink();
      const result = syncSkillToWorkspace(db, agent, 'nonexistent', workspaceDir, symlink);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trusted source not found');
    });

    it('returns error when agent has no skill dir', () => {
      const noDirAgent = createAgent(db, {
        id: 'no-dir',
        name: 'No Dir',
        configDirName: '.no-dir',
        skillDir: null,
        enabled: true,
      });
      const symlink = createMockSymlink();
      const result = syncSkillToWorkspace(db, noDirAgent, 'test', workspaceDir, symlink);
      expect(result.success).toBe(false);
    });
  });

  describe('syncMcpToWorkspace', () => {
    it('renders MCP from trusted source to agent config', () => {
      const schema = {
        name: 'test-server',
        transport: 'stdio' as const,
        command: 'npx',
        args: ['mcp-server'],
      };
      saveMcpToWorkspace(workspaceDir, schema);

      const agentConfigPath = path.join(agentDir, 'settings.json');
      fs.writeFileSync(agentConfigPath, JSON.stringify({ other: 'data' }));

      const mcp = createMcp(db, { name: 'test-server', transport: 'stdio', command: 'npx', args: ['mcp-server'] });
      db.prepare(
        "INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked) VALUES ('mcp', ?, ?, 0)",
      ).run(mcp.id, agent.id);

      const result = syncMcpToWorkspace(db, agent, template, 'test-server', workspaceDir);

      expect(result.success).toBe(true);

      const after = JSON.parse(fs.readFileSync(agentConfigPath, 'utf-8'));
      expect(after.mcpServers['test-server']).toBeDefined();
      expect(after.mcpServers['test-server'].command).toBe('npx');
      expect(after.other).toBe('data');
    });

    it('returns error when trusted MCP source not found', () => {
      const result = syncMcpToWorkspace(db, agent, template, 'nonexistent', workspaceDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trusted MCP source not found');
    });

    it('returns error when agent does not support MCP', () => {
      const noMcpTemplate: AgentTemplate = { ...template, mcpFile: null, mcpField: null };
      const result = syncMcpToWorkspace(db, agent, noMcpTemplate, 'test', workspaceDir);
      expect(result.success).toBe(false);
    });
  });

  describe('syncAgentAll', () => {
    it('syncs all skills and MCPs for an agent', () => {
      const trustedSkill = path.join(workspaceDir, 'skills', 'my-skill');
      fs.mkdirSync(trustedSkill, { recursive: true });
      fs.writeFileSync(path.join(trustedSkill, 'SKILL.md'), 'content');

      const schema = { name: 'my-mcp', transport: 'stdio' as const, command: 'cmd' };
      saveMcpToWorkspace(workspaceDir, schema);

      const skill = createSkill(db, { name: 'my-skill', sourcePath: trustedSkill });
      const mcp = createMcp(db, { name: 'my-mcp', transport: 'stdio', command: 'cmd' });

      db.prepare(
        "INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked) VALUES ('skill', ?, ?, 0)",
      ).run(skill.id, agent.id);
      db.prepare(
        "INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked) VALUES ('mcp', ?, ?, 0)",
      ).run(mcp.id, agent.id);

      const agentSkillDir = path.join(agentDir, 'skills');
      fs.mkdirSync(agentSkillDir, { recursive: true });

      const symlink = createMockSymlink();
      const result = syncAgentAll(db, agent, template, workspaceDir, symlink);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('continues on partial failure', () => {
      const trustedSkill = path.join(workspaceDir, 'skills', 'good-skill');
      fs.mkdirSync(trustedSkill, { recursive: true });

      const skill = createSkill(db, { name: 'good-skill', sourcePath: trustedSkill });
      db.prepare(
        "INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked) VALUES ('skill', ?, ?, 0)",
      ).run(skill.id, agent.id);

      const mcp = createMcp(db, { name: 'missing-mcp', transport: 'stdio', command: 'cmd' });
      db.prepare(
        "INSERT INTO resource_agent (resource_type, resource_id, agent_id, symlinked) VALUES ('mcp', ?, ?, 0)",
      ).run(mcp.id, agent.id);

      const agentSkillDir = path.join(agentDir, 'skills');
      fs.mkdirSync(agentSkillDir, { recursive: true });

      const symlink = createMockSymlink();
      const result = syncAgentAll(db, agent, template, workspaceDir, symlink);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('returns zero results when agent has no resources', () => {
      const symlink = createMockSymlink();
      const result = syncAgentAll(db, agent, template, workspaceDir, symlink);
      expect(result.results).toHaveLength(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
