import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { migrate } from '../db/migrate.js';
import { createSkill } from '../skill/manager.js';
import { checkSkillConsistency, fixSkillConsistency } from '../sync/consistency.js';

describe('skill consistency (description staleness)', () => {
  let db: Database.Database;
  let dataDir: string;
  let skillsDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-skill-consist-'));
    skillsDir = path.join(dataDir, 'skills');
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  function writeSkill(name: string, description: string): string {
    const dir = path.join(skillsDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n`,
    );
    return dir;
  }

  it('flags a skill whose database description is stale vs SKILL.md', () => {
    writeSkill('my-skill', 'Updated description from the skill file');
    createSkill(db, { name: 'my-skill', description: 'Old stale description' });

    const result = checkSkillConsistency(db, dataDir);
    expect(result.consistent).toBe(false);

    const stale = result.items.find((i) => i.name === 'my-skill');
    expect(stale).toBeDefined();
    expect(stale!.outOfSync).toBe(true);
    expect(stale!.action).toBe('sync');
    expect(stale!.location).toBe('directory');
    expect(stale!.reason).toBe('description');
  });

  it('does not flag a skill when database description matches SKILL.md', () => {
    writeSkill('my-skill', 'Matching description');
    createSkill(db, { name: 'my-skill', description: 'Matching description' });

    const result = checkSkillConsistency(db, dataDir);
    expect(result.consistent).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('fixes a stale description by refreshing the database from SKILL.md', () => {
    writeSkill('my-skill', 'Refreshed description');
    const created = createSkill(db, { name: 'my-skill', description: 'Stale' });

    const fix = fixSkillConsistency(db, dataDir);
    expect(fix.synced).toContain('my-skill');

    const row = db.prepare('SELECT description FROM skill WHERE id = ?').get(created.id) as {
      description: string;
    };
    expect(row.description).toBe('Refreshed description');
  });

  it('still reports directory-only skills as sync (new), not stale', () => {
    writeSkill('new-skill', 'A brand new skill description');

    const result = checkSkillConsistency(db, dataDir);
    const item = result.items.find((i) => i.name === 'new-skill');
    expect(item).toBeDefined();
    expect(item!.outOfSync).toBeFalsy();
    expect(item!.action).toBe('sync');
  });
});
