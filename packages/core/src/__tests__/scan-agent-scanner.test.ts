import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../db/migrate.js';
import { createAgent } from '../agent/registry.js';
import { createSkill } from '../skill/manager.js';
import { createMcp } from '../mcp/manager.js';
import { scanSkillsFromAgents, scanMcpsFromAgents, scanSkillsFromProject, scanMcpsFromProject } from '../scan/agent-scanner.js';
import type { Agent } from '../agent/types.js';
import type { Project } from '../project/types.js';

describe('Agent Scanner', () => {
  let db: Database.Database;
  let tmpDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-agent-scanner-'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createAgentWithDirs(overrides?: Partial<Agent>): Agent {
    return createAgent(db, {
      id: 'test-agent',
      name: 'Test Agent',
      configDirName: '.test-agent',
      userRoot: path.join(tmpDir, 'agent-config'),
      skillDir: 'skills',
      mcpFile: 'settings.json',
      mcpField: 'mcpServers',
      enabled: true,
      ...overrides,
    });
  }

  function createSkillOnDisk(agentDir: string, skillName: string, description = 'A test skill description'): string {
    const skillDir = path.join(agentDir, 'skills', skillName);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: ${skillName}\ndescription: ${description}\n---\n# ${skillName}\n`,
    );
    return skillDir;
  }

  function createMcpConfigFile(agentDir: string, servers: Record<string, unknown>): void {
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'settings.json'),
      JSON.stringify({ mcpServers: servers }, null, 2),
    );
  }

  describe('scanSkillsFromAgents', () => {
    it('scans new skills from agent directories', () => {
      const agent = createAgentWithDirs();
      const agentDir = agent.userRoot!;
      createSkillOnDisk(agentDir, 'my-skill');

      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('my-skill');
      expect(results[0].classification).toBe('new');
      expect(results[0].agentId).toBe('test-agent');
    });

    it('classifies skill as synced when source_path matches', () => {
      const agent = createAgentWithDirs();
      const agentDir = agent.userRoot!;
      const skillPath = createSkillOnDisk(agentDir, 'my-skill');

      createSkill(db, { name: 'my-skill', sourcePath: skillPath });

      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].classification).toBe('synced');
    });

    it('classifies skill as conflict when source_path differs', () => {
      const agent = createAgentWithDirs();
      const agentDir = agent.userRoot!;
      createSkillOnDisk(agentDir, 'my-skill');

      createSkill(db, { name: 'my-skill', sourcePath: '/some/other/path' });

      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].classification).toBe('conflict');
    });

    it('skips symlinks in agent skill directory', () => {
      const agent = createAgentWithDirs();
      const agentDir = agent.userRoot!;
      const skillDir = path.join(agentDir, 'skills');
      fs.mkdirSync(skillDir, { recursive: true });

      const realDir = path.join(tmpDir, 'real-skill');
      fs.mkdirSync(realDir);
      fs.writeFileSync(
        path.join(realDir, 'SKILL.md'),
        '---\nname: linked-skill\ndescription: A linked skill description\n---\n',
      );

      fs.symlinkSync(realDir, path.join(skillDir, 'linked-skill'), 'dir');

      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(0);
    });

    it('skips disabled agents', () => {
      const agent = createAgentWithDirs({ enabled: false });
      const agentDir = agent.userRoot!;
      createSkillOnDisk(agentDir, 'my-skill');

      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(0);
    });

    it('returns empty for non-existent skill directory', () => {
      const agent = createAgentWithDirs();
      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(0);
    });

    it('scans multiple skills and classifies each', () => {
      const agent = createAgentWithDirs();
      const agentDir = agent.userRoot!;
      const skill1Path = createSkillOnDisk(agentDir, 'skill-one');
      createSkillOnDisk(agentDir, 'skill-two');
      createSkillOnDisk(agentDir, 'skill-three');

      createSkill(db, { name: 'skill-one', sourcePath: skill1Path });
      createSkill(db, { name: 'skill-two', sourcePath: '/different/path' });

      const results = scanSkillsFromAgents(db, [agent]);
      expect(results).toHaveLength(3);

      const byName = Object.fromEntries(results.map((r) => [r.name, r.classification]));
      expect(byName['skill-one']).toBe('synced');
      expect(byName['skill-two']).toBe('conflict');
      expect(byName['skill-three']).toBe('new');
    });
  });

  describe('scanMcpsFromAgents', () => {
    it('scans new MCP servers from agent config', () => {
      const agent = createAgentWithDirs();
      createMcpConfigFile(agent.userRoot!, {
        'my-server': { command: 'npx', args: ['mcp-server'] },
      });

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('my-server');
      expect(results[0].classification).toBe('new');
      expect(results[0].schema.transport).toBe('stdio');
      expect(results[0].schema.command).toBe('npx');
    });

    it('scans MCP with url as sse transport', () => {
      const agent = createAgentWithDirs();
      createMcpConfigFile(agent.userRoot!, {
        'remote-server': { url: 'http://localhost:3000' },
      });

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].schema.transport).toBe('sse');
      expect(results[0].schema.url).toBe('http://localhost:3000');
    });

    it('classifies MCP as synced when DB matches', () => {
      const agent = createAgentWithDirs();
      createMcpConfigFile(agent.userRoot!, {
        'my-server': { command: 'npx', args: ['mcp-server'] },
      });

      createMcp(db, {
        name: 'my-server',
        transport: 'stdio',
        command: 'npx',
        args: ['mcp-server'],
      });

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].classification).toBe('synced');
    });

    it('classifies MCP as conflict when DB differs', () => {
      const agent = createAgentWithDirs();
      createMcpConfigFile(agent.userRoot!, {
        'my-server': { command: 'npx', args: ['mcp-server'] },
      });

      createMcp(db, {
        name: 'my-server',
        transport: 'stdio',
        command: 'different-command',
      });

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].classification).toBe('conflict');
    });

    it('returns empty when agent has no MCP file', () => {
      const agent = createAgentWithDirs({ mcpFile: null, mcpField: null });
      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(0);
    });

    it('returns empty for non-existent config file', () => {
      const agent = createAgentWithDirs();
      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(0);
    });

    it('scans multiple MCPs from one config file', () => {
      const agent = createAgentWithDirs();
      createMcpConfigFile(agent.userRoot!, {
        'server-a': { command: 'cmd-a' },
        'server-b': { url: 'http://b.com' },
      });

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(2);
    });

    it('scans MCPs from toml config with agent-specific field', () => {
      const agent = createAgentWithDirs({ mcpFile: 'config.toml', mcpField: 'mcp_servers' });
      const agentDir = agent.userRoot!;
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'config.toml'),
        [
          '[mcp_servers.playwright]',
          'command = "npx"',
          'args = ["@playwright/mcp@latest"]',
          '',
          '[mcp_servers.weather]',
          'command = "python"',
          'env = { "API_KEY" = "abc123" }',
          '',
        ].join('\n'),
      );

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(2);

      const playwright = results.find((r) => r.name === 'playwright')!;
      expect(playwright.schema.command).toBe('npx');
      expect(playwright.schema.args).toEqual(['@playwright/mcp@latest']);

      const weather = results.find((r) => r.name === 'weather')!;
      expect(weather.schema.env).toEqual({ API_KEY: 'abc123' });
    });

    it('scans MCP with url from toml as sse transport', () => {
      const agent = createAgentWithDirs({ mcpFile: 'config.toml', mcpField: 'mcp_servers' });
      const agentDir = agent.userRoot!;
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'config.toml'),
        [
          '[mcp_servers.remote]',
          'url = "http://localhost:8080"',
          '',
        ].join('\n'),
      );

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].schema.transport).toBe('sse');
      expect(results[0].schema.url).toBe('http://localhost:8080');
    });

    it('ignores sections outside the mcp field in toml', () => {
      const agent = createAgentWithDirs({ mcpFile: 'config.toml', mcpField: 'mcp_servers' });
      const agentDir = agent.userRoot!;
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'config.toml'),
        [
          '[other_section]',
          'command = "not-an-mcp"',
          '',
          '[mcp_servers.real]',
          'command = "npx"',
          '',
        ].join('\n'),
      );

      const results = scanMcpsFromAgents(db, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('real');
    });
  });

  describe('scanSkillsFromProject / scanMcpsFromProject', () => {
    function makeProject(): Project {
      return {
        id: 'test-project',
        name: 'Test Project',
        path: path.join(tmpDir, 'project'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    it('scans new skills from a project agent directory', () => {
      const agent = createAgentWithDirs();
      const project = makeProject();
      const agentDir = path.join(project.path, agent.configDirName!);
      createSkillOnDisk(agentDir, 'project-skill');

      const results = scanSkillsFromProject(db, project, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('project-skill');
      expect(results[0].classification).toBe('new');
    });

    it('skips symlinks deployed by Workspace Switch', () => {
      const agent = createAgentWithDirs();
      const project = makeProject();
      const agentDir = path.join(project.path, agent.configDirName!);
      const skillDir = path.join(agentDir, 'skills');
      fs.mkdirSync(skillDir, { recursive: true });

      const realDir = path.join(tmpDir, 'real-project-skill');
      fs.mkdirSync(realDir);
      fs.writeFileSync(
        path.join(realDir, 'SKILL.md'),
        '---\nname: linked-skill\ndescription: A linked skill\n---\n',
      );
      fs.symlinkSync(realDir, path.join(skillDir, 'linked-skill'), 'dir');

      const results = scanSkillsFromProject(db, project, [agent]);
      expect(results).toHaveLength(0);
    });

    it('classifies project skills as synced/conflict like the agent scanner', () => {
      const agent = createAgentWithDirs();
      const project = makeProject();
      const agentDir = path.join(project.path, agent.configDirName!);
      const skillPath = createSkillOnDisk(agentDir, 'project-skill');
      createSkill(db, { name: 'project-skill', sourcePath: skillPath });

      const results = scanSkillsFromProject(db, project, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].classification).toBe('synced');
    });

    it('scans new MCP servers from a project agent config file', () => {
      const agent = createAgentWithDirs();
      const project = makeProject();
      const agentDir = path.join(project.path, agent.configDirName!);
      createMcpConfigFile(agentDir, {
        'project-server': { command: 'npx', args: ['mcp-project'] },
      });

      const results = scanMcpsFromProject(db, project, [agent]);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('project-server');
      expect(results[0].classification).toBe('new');
    });

    it('returns empty when no project agent config file exists', () => {
      const agent = createAgentWithDirs();
      const project = makeProject();
      const results = scanMcpsFromProject(db, project, [agent]);
      expect(results).toHaveLength(0);
    });
  });
});
