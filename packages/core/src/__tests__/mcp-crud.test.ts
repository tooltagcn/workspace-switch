import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import {
  listMcps,
  getMcp,
  createMcp,
  updateMcp,
  deleteMcp,
  addMcpTag,
  removeMcpTag,
  setMcpTags,
} from '../mcp/manager.js';

describe('MCP CRUD', () => {
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

  it('creates an MCP server', () => {
    const mcp = createMcp(db, {
      name: 'my-server',
      transport: 'stdio',
      command: 'npx',
      args: ['mcp-server'],
      env: { API_KEY: 'secret' },
    });
    expect(mcp.id).toBeDefined();
    expect(mcp.name).toBe('my-server');
    expect(mcp.transport).toBe('stdio');
    expect(mcp.command).toBe('npx');
    expect(mcp.args).toEqual(['mcp-server']);
    expect(mcp.env).toEqual({ API_KEY: 'secret' });
    expect(mcp.tags).toEqual([]);
  });

  it('lists MCP servers', () => {
    createMcp(db, { name: 'alpha' });
    createMcp(db, { name: 'beta' });
    const mcps = listMcps(db);
    expect(mcps).toHaveLength(2);
    expect(mcps[0].name).toBe('alpha');
    expect(mcps[1].name).toBe('beta');
  });

  it('gets an MCP server by id', () => {
    const created = createMcp(db, { name: 'test' });
    const fetched = getMcp(db, created.id);
    expect(fetched).toEqual(created);
  });

  it('returns null for non-existent MCP server', () => {
    expect(getMcp(db, 'nonexistent')).toBeNull();
  });

  it('updates an MCP server', () => {
    const mcp = createMcp(db, { name: 'old', transport: 'stdio', command: 'old-cmd' });
    const updated = updateMcp(db, mcp.id, { name: 'new', command: 'new-cmd' });
    expect(updated!.name).toBe('new');
    expect(updated!.command).toBe('new-cmd');
    expect(updated!.transport).toBe('stdio');
  });

  it('deletes an MCP server', () => {
    const mcp = createMcp(db, { name: 'temp' });
    expect(deleteMcp(db, mcp.id)).toBe(true);
    expect(getMcp(db, mcp.id)).toBeNull();
  });

  it('returns false when deleting non-existent MCP server', () => {
    expect(deleteMcp(db, 'nonexistent')).toBe(false);
  });

  it('supports custom id', () => {
    const mcp = createMcp(db, { id: 'custom-id', name: 'custom' });
    expect(mcp.id).toBe('custom-id');
  });

  it('enforces unique name with a friendly error', () => {
    createMcp(db, { name: 'unique' });
    expect(() => createMcp(db, { name: 'unique' })).toThrow('already exists');
  });

  it('rejects duplicate name on update (rename collision)', () => {
    createMcp(db, { name: 'keep' });
    const mcp = createMcp(db, { name: 'rename' });
    expect(() => updateMcp(db, mcp.id, { name: 'keep' })).toThrow('already exists');
    // non-colliding rename still works
    expect(updateMcp(db, mcp.id, { name: 'renamed-ok' })!.name).toBe('renamed-ok');
  });

  it('defaults args and env to empty', () => {
    const mcp = createMcp(db, { name: 'minimal' });
    expect(mcp.args).toEqual([]);
    expect(mcp.env).toEqual({});
  });
});

describe('MCP tags', () => {
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

  it('creates an MCP server with tags', () => {
    const mcp = createMcp(db, { name: 'tagged', tags: ['dev', 'api'] });
    expect(mcp.tags).toEqual(['api', 'dev']);
  });

  it('adds a tag', () => {
    const mcp = createMcp(db, { name: 's1' });
    const updated = addMcpTag(db, mcp.id, 'typescript');
    expect(updated.tags).toEqual(['typescript']);
  });

  it('removes a tag', () => {
    const mcp = createMcp(db, { name: 's1', tags: ['a', 'b', 'c'] });
    const updated = removeMcpTag(db, mcp.id, 'b');
    expect(updated.tags).toEqual(['a', 'c']);
  });

  it('sets tags (replaces all)', () => {
    const mcp = createMcp(db, { name: 's1', tags: ['a', 'b'] });
    const updated = setMcpTags(db, mcp.id, ['x', 'y', 'z']);
    expect(updated.tags).toEqual(['x', 'y', 'z']);
  });

  it('filters MCP servers by tag', () => {
    createMcp(db, { name: 'api-server', tags: ['backend', 'api'] });
    createMcp(db, { name: 'fs-server', tags: ['backend', 'fs'] });
    createMcp(db, { name: 'ui-server', tags: ['frontend', 'ui'] });

    const backend = listMcps(db, { tags: ['backend'] });
    expect(backend).toHaveLength(2);
    expect(backend.map((m) => m.name).sort()).toEqual(['api-server', 'fs-server']);
  });

  it('addMcpTag throws for non-existent MCP server', () => {
    expect(() => addMcpTag(db, 'nonexistent', 'tag')).toThrow('MCP server not found');
  });

  it('removeMcpTag throws for non-existent MCP server', () => {
    expect(() => removeMcpTag(db, 'nonexistent', 'tag')).toThrow('MCP server not found');
  });

  it('setMcpTags throws for non-existent MCP server', () => {
    expect(() => setMcpTags(db, 'nonexistent', ['tag'])).toThrow('MCP server not found');
  });

  it('deleteMcp cleans up tags', () => {
    const mcp = createMcp(db, { name: 's1', tags: ['a', 'b'] });
    deleteMcp(db, mcp.id);
    const reborn = createMcp(db, { id: mcp.id, name: 's1-reborn', tags: ['c'] });
    expect(reborn.tags).toEqual(['c']);
  });
});
