import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../db/migrate.js';
import { createAgent } from '../agent/registry.js';
import { importScannedSkills, importScannedMcps } from '../scan/importer.js';
import type { ScannedSkill, ScannedMcp } from '../scan/types.js';
import type { WsMcpSchema } from '../mcp/schema.js';

describe('Scan Importer', () => {
  let db: Database.Database;
  let tmpDir: string;
  let workspaceDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-importer-'));
    workspaceDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(workspaceDir, { recursive: true });
    createAgent(db, {
      id: 'agent-1',
      name: 'Agent 1',
      configDirName: '.agent-1',
      enabled: true,
    });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSkillSource(name: string): string {
    const skillDir = path.join(tmpDir, 'agent-skills', name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: ${name}\ndescription: A test skill for importing\n---\n# ${name}\n`,
    );
    return skillDir;
  }

  describe('importScannedSkills', () => {
    it('copies new skill to workspace and writes DB', () => {
      const sourcePath = createSkillSource('my-skill');
      const skills: ScannedSkill[] = [{
        name: 'my-skill',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        sourcePath,
        classification: 'new',
        description: 'A test skill for importing',
      }];

      const results = importScannedSkills(db, skills, workspaceDir);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('my-skill');
      expect(results[0].alreadyExisted).toBe(false);

      const destPath = path.join(workspaceDir, 'skills', 'my-skill');
      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.existsSync(path.join(destPath, 'SKILL.md'))).toBe(true);

      const row = db.prepare('SELECT * FROM skill WHERE name = ?').get('my-skill') as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.source_path).toBe(destPath);

      const ra = db.prepare(
        "SELECT * FROM resource_agent WHERE resource_type = 'skill' AND agent_id = ?",
      ).get('agent-1') as Record<string, unknown>;
      expect(ra).toBeDefined();
      expect(ra.symlinked).toBe(0);
    });

    it('skips synced skills', () => {
      const sourcePath = createSkillSource('synced-skill');
      const skills: ScannedSkill[] = [{
        name: 'synced-skill',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        sourcePath,
        classification: 'synced',
        description: 'Already synced',
      }];

      const results = importScannedSkills(db, skills, workspaceDir);
      expect(results).toHaveLength(0);
    });

    it('does not overwrite existing workspace copy', () => {
      const sourcePath = createSkillSource('my-skill');
      const destPath = path.join(workspaceDir, 'skills', 'my-skill');
      fs.mkdirSync(destPath, { recursive: true });
      fs.writeFileSync(path.join(destPath, 'SKILL.md'), 'existing content');

      const skills: ScannedSkill[] = [{
        name: 'my-skill',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        sourcePath,
        classification: 'conflict',
        description: 'A test skill for importing',
      }];

      const results = importScannedSkills(db, skills, workspaceDir);
      expect(results).toHaveLength(1);
      expect(results[0].alreadyExisted).toBe(true);

      const content = fs.readFileSync(path.join(destPath, 'SKILL.md'), 'utf-8');
      expect(content).toBe('existing content');
    });

    it('agent source files remain untouched', () => {
      const sourcePath = createSkillSource('my-skill');
      const originalContent = fs.readFileSync(path.join(sourcePath, 'SKILL.md'), 'utf-8');

      const skills: ScannedSkill[] = [{
        name: 'my-skill',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        sourcePath,
        classification: 'new',
        description: 'A test skill for importing',
      }];

      importScannedSkills(db, skills, workspaceDir);

      const afterContent = fs.readFileSync(path.join(sourcePath, 'SKILL.md'), 'utf-8');
      expect(afterContent).toBe(originalContent);
    });
  });

  describe('importScannedMcps', () => {
    it('writes MCP to workspace and DB', () => {
      const schema: WsMcpSchema = {
        name: 'test-server',
        transport: 'stdio',
        command: 'npx',
        args: ['mcp-server'],
      };

      const mcps: ScannedMcp[] = [{
        name: 'test-server',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        sourcePath: '/fake/path/settings.json',
        classification: 'new',
        schema,
      }];

      const results = importScannedMcps(db, mcps, workspaceDir);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test-server');

      const mcpFile = path.join(workspaceDir, 'mcp', 'test-server.json');
      expect(fs.existsSync(mcpFile)).toBe(true);

      const row = db.prepare('SELECT * FROM mcp WHERE name = ?').get('test-server') as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.transport).toBe('stdio');
      expect(row.command).toBe('npx');

      const ra = db.prepare(
        "SELECT * FROM resource_agent WHERE resource_type = 'mcp' AND agent_id = ?",
      ).get('agent-1') as Record<string, unknown>;
      expect(ra).toBeDefined();
      expect(ra.symlinked).toBe(0);
    });

    it('skips synced MCPs', () => {
      const schema: WsMcpSchema = {
        name: 'synced-server',
        transport: 'sse',
        url: 'http://localhost:3000',
      };

      const mcps: ScannedMcp[] = [{
        name: 'synced-server',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        sourcePath: '/fake/path',
        classification: 'synced',
        schema,
      }];

      const results = importScannedMcps(db, mcps, workspaceDir);
      expect(results).toHaveLength(0);
    });
  });
});
