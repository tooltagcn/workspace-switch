import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../db/migrate.js';
import { createAgent } from '../agent/registry.js';
import { createSkill } from '../skill/manager.js';
import { syncSkillToWorkspace } from '../sync/agent-sync.js';
import { getSymlinkImpl } from '../sync/symlink.js';
import { scanSkillApplyStatus } from '../skill/apply-status.js';

describe('scanSkillApplyStatus', () => {
  let db: Database.Database;
  let tmpDir: string;
  let workspaceDir: string;
  let symlink: ReturnType<typeof getSymlinkImpl>;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-apply-scan-'));
    workspaceDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(path.join(workspaceDir, 'skills'), { recursive: true });
    symlink = getSymlinkImpl();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeAgent(name = 'Agent') {
    return createAgent(db, {
      id: name.toLowerCase().replace(/\s/g, ''),
      name,
      configDirName: '.agent',
      userRoot: path.join(tmpDir, 'agents', name.toLowerCase()),
      skillDir: 'skills',
      enabled: true,
    });
  }

  function makeSkill(name: string) {
    const sourcePath = path.join(workspaceDir, 'skills', name);
    fs.mkdirSync(sourcePath, { recursive: true });
    fs.writeFileSync(path.join(sourcePath, 'SKILL.md'), `---\nname: ${name}\ndescription: d\n---\n`);
    return createSkill(db, { name, sourcePath });
  }

  it('reports applied when symlink points to trusted source and DB record exists', () => {
    const agent = makeAgent();
    makeSkill('alpha');
    syncSkillToWorkspace(db, agent, 'alpha', workspaceDir, symlink);

    const res = scanSkillApplyStatus(db, workspaceDir);
    const cell = res.rows.find((r) => r.skillName === 'alpha')!.cells[0];
    expect(cell.state).toBe('applied');
  });

  it('reports missing when DB record exists but the symlink is gone (drift)', () => {
    const agent = makeAgent();
    makeSkill('beta');
    syncSkillToWorkspace(db, agent, 'beta', workspaceDir, symlink);

    fs.rmSync(path.join(agent.userRoot!, 'skills', 'beta'));

    const res = scanSkillApplyStatus(db, workspaceDir);
    expect(res.rows.find((r) => r.skillName === 'beta')!.cells[0].state).toBe('missing');
  });

  it('reports orphan when a symlink exists on disk but there is no DB record', () => {
    const agent = makeAgent();
    makeSkill('gamma');
    const target = path.join(workspaceDir, 'skills', 'gamma');
    const link = path.join(agent.userRoot!, 'skills', 'gamma');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    symlink.createSymlink(target, link);

    const res = scanSkillApplyStatus(db, workspaceDir);
    expect(res.rows.find((r) => r.skillName === 'gamma')!.cells[0].state).toBe('orphan');
  });

  it('reports conflict when a real directory shadows the skill', () => {
    const agent = makeAgent();
    makeSkill('delta');
    const dir = path.join(agent.userRoot!, 'skills', 'delta');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), 'x');

    const res = scanSkillApplyStatus(db, workspaceDir);
    expect(res.rows.find((r) => r.skillName === 'delta')!.cells[0].state).toBe('conflict');
  });

  it('reports notApplied when nothing is on disk and there is no DB record', () => {
    const agent = makeAgent();
    makeSkill('epsilon');

    const res = scanSkillApplyStatus(db, workspaceDir);
    expect(res.rows.find((r) => r.skillName === 'epsilon')!.cells[0].state).toBe('notApplied');
  });

  it('only includes enabled agents that have a skill directory', () => {
    makeAgent('Enabled');
    makeAgent('Disabled');
    db.prepare('UPDATE agent SET enabled = 0 WHERE id = ?').run('disabled');
    makeSkill('zeta');

    const res = scanSkillApplyStatus(db, workspaceDir);
    expect(res.agents.map((a) => a.agentName)).toEqual(['Enabled']);
  });

  it('aggregates counts across all skill × agent cells', () => {
    const agent = makeAgent();
    makeSkill('a');
    makeSkill('b');
    makeSkill('c');
    syncSkillToWorkspace(db, agent, 'a', workspaceDir, symlink);

    const res = scanSkillApplyStatus(db, workspaceDir);
    expect(res.counts.applied).toBe(1);
    expect(res.counts.notApplied).toBe(2);
  });
});
