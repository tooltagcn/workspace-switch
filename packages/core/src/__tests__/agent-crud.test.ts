import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../agent/registry.js';

describe('Agent CRUD', () => {
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

  it('creates an agent', () => {
    const agent = createAgent(db, { name: 'Claude Code', configDirName: '.claude' });
    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Claude Code');
    expect(agent.configDirName).toBe('.claude');
    expect(agent.builtin).toBe(false);
    expect(agent.enabled).toBe(true);
  });

  it('lists agents', () => {
    createAgent(db, { name: 'Agent A', configDirName: '.a' });
    createAgent(db, { name: 'Agent B', configDirName: '.b' });
    const agents = listAgents(db);
    expect(agents).toHaveLength(2);
    expect(agents[0].name).toBe('Agent A');
    expect(agents[1].name).toBe('Agent B');
  });

  it('gets an agent by id', () => {
    const created = createAgent(db, { name: 'Test', configDirName: '.test' });
    const fetched = getAgent(db, created.id);
    expect(fetched).toEqual(created);
  });

  it('returns null for non-existent agent', () => {
    expect(getAgent(db, 'nonexistent')).toBeNull();
  });

  it('updates an agent', () => {
    const agent = createAgent(db, { name: 'Old Name', configDirName: '.old' });
    const updated = updateAgent(db, agent.id, { name: 'New Name', configDirName: '.new' });
    expect(updated!.name).toBe('New Name');
    expect(updated!.configDirName).toBe('.new');
    expect(updated!.updatedAt).not.toBe(agent.updatedAt);
  });

  it('deletes a non-builtin agent', () => {
    const agent = createAgent(db, { name: 'Temp', configDirName: '.temp' });
    expect(deleteAgent(db, agent.id)).toBe(true);
    expect(getAgent(db, agent.id)).toBeNull();
  });

  it('prevents deleting a builtin agent', () => {
    const agent = createAgent(db, { name: 'Builtin', configDirName: '.builtin', builtin: true });
    expect(() => deleteAgent(db, agent.id)).toThrow('Cannot delete builtin agent');
    expect(getAgent(db, agent.id)).toBeDefined();
  });

  it('returns false when deleting non-existent agent', () => {
    expect(deleteAgent(db, 'nonexistent')).toBe(false);
  });

  it('supports custom id', () => {
    const agent = createAgent(db, { id: 'custom-id', name: 'Custom', configDirName: '.custom' });
    expect(agent.id).toBe('custom-id');
  });
});
