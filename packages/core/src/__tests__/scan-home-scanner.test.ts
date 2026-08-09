import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../db/migrate.js';
import { scanHomeHiddenFolders, scanSkillsFromFolders, scanMcpsFromFolders } from '../scan/home-scanner.js';
import type { AgentTemplate } from '../agent/template-types.js';

describe('Home Scanner', () => {
  let db: Database.Database;
  let tmpDir: string;

  const templates: AgentTemplate[] = [
    {
      id: 'claude-code',
      name: 'Claude Code',
      configDirName: '.claude',
      candidateDirNames: ['.claude'],
      mcpFile: 'settings.json',
      mcpField: 'mcpServers',
      skillDir: 'commands',
      icon: null,
      targetFormat: 'json-map',
    },
    {
      id: 'cursor',
      name: 'Cursor',
      configDirName: '.cursor',
      mcpFile: 'settings.json',
      mcpField: 'mcpServers',
      skillDir: null,
      icon: null,
      targetFormat: 'json-map',
    },
  ];

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-home-scanner-'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanHomeHiddenFolders', () => {
    it('finds hidden folders matching agent templates', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));
      fs.mkdirSync(path.join(tmpDir, '.cursor'));
      fs.mkdirSync(path.join(tmpDir, '.other'));

      const results = scanHomeHiddenFolders(tmpDir, templates);
      expect(results).toHaveLength(3);

      const claude = results.find((r) => r.dirName === '.claude');
      expect(claude).toBeDefined();
      expect(claude!.matchedAgentId).toBe('claude-code');
      expect(claude!.matchedAgentName).toBe('Claude Code');

      const cursor = results.find((r) => r.dirName === '.cursor');
      expect(cursor).toBeDefined();
      expect(cursor!.matchedAgentId).toBe('cursor');
    });

    it('returns unmatched folders with null agent', () => {
      fs.mkdirSync(path.join(tmpDir, '.unknown-tool'));

      const results = scanHomeHiddenFolders(tmpDir, templates);
      expect(results).toHaveLength(1);
      expect(results[0].matchedAgentId).toBeNull();
      expect(results[0].matchedAgentName).toBeNull();
    });

    it('ignores non-hidden directories', () => {
      fs.mkdirSync(path.join(tmpDir, 'visible-dir'));

      const results = scanHomeHiddenFolders(tmpDir, templates);
      expect(results).toHaveLength(0);
    });

    it('returns empty for non-existent home directory', () => {
      const results = scanHomeHiddenFolders('/nonexistent/path', templates);
      expect(results).toHaveLength(0);
    });

    it('skips symlinked hidden directories', () => {
      const realDir = path.join(tmpDir, 'real-claude');
      fs.mkdirSync(realDir);
      fs.symlinkSync(realDir, path.join(tmpDir, '.claude'), 'dir');

      const results = scanHomeHiddenFolders(tmpDir, templates);
      expect(results).toHaveLength(0);
    });
  });

  describe('scanSkillsFromFolders', () => {
    it('scans skills from matched folders', () => {
      const claudeDir = path.join(tmpDir, '.claude');
      const skillDir = path.join(claudeDir, 'commands', 'my-command');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: my-command\ndescription: A test command description\n---\n',
      );

      const folders = scanHomeHiddenFolders(tmpDir, templates);
      const matchedFolders = folders.filter((f) => f.matchedAgentId);

      const results = scanSkillsFromFolders(db, matchedFolders, templates);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('my-command');
    });

    it('returns empty when no folders match templates', () => {
      fs.mkdirSync(path.join(tmpDir, '.unknown'));

      const folders = scanHomeHiddenFolders(tmpDir, templates);
      const results = scanSkillsFromFolders(db, folders, templates);
      expect(results).toHaveLength(0);
    });
  });

  describe('scanMcpsFromFolders', () => {
    it('scans MCPs from matched folders', () => {
      const claudeDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(claudeDir, 'settings.json'),
        JSON.stringify({
          mcpServers: {
            'test-server': { command: 'npx', args: ['test'] },
          },
        }),
      );

      const folders = scanHomeHiddenFolders(tmpDir, templates);
      const matchedFolders = folders.filter((f) => f.matchedAgentId);

      const results = scanMcpsFromFolders(db, matchedFolders, templates);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test-server');
    });

    it('returns empty when no skill-mcp config exists', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));

      const folders = scanHomeHiddenFolders(tmpDir, templates);
      const matchedFolders = folders.filter((f) => f.matchedAgentId);

      const results = scanMcpsFromFolders(db, matchedFolders, templates);
      expect(results).toHaveLength(0);
    });
  });
});
