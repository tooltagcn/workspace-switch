import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import {
  listTags,
  getTag,
  getTagByName,
  createTag,
  renameTag,
  mergeTags,
  deleteTag,
} from '../tag/manager.js';
import { createSkill } from '../skill/manager.js';

describe('Tag Manager', () => {
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

  it('creates a tag', () => {
    const tag = createTag(db, { name: 'frontend' });
    expect(tag.id).toBeDefined();
    expect(tag.name).toBe('frontend');
    expect(tag.color).toBeNull();
  });

  it('creates a tag with color', () => {
    const tag = createTag(db, { name: 'urgent', color: '#ff0000' });
    expect(tag.color).toBe('#ff0000');
  });

  it('lists tags sorted by name', () => {
    createTag(db, { name: 'beta' });
    createTag(db, { name: 'alpha' });
    const tags = listTags(db);
    expect(tags).toHaveLength(2);
    expect(tags[0].name).toBe('alpha');
    expect(tags[1].name).toBe('beta');
  });

  it('gets tag by id', () => {
    const created = createTag(db, { name: 'test' });
    const fetched = getTag(db, created.id);
    expect(fetched).toEqual(created);
  });

  it('gets tag by name', () => {
    createTag(db, { name: 'findme' });
    const fetched = getTagByName(db, 'findme');
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('findme');
  });

  it('returns null for non-existent tag', () => {
    expect(getTag(db, 'nope')).toBeNull();
    expect(getTagByName(db, 'nope')).toBeNull();
  });

  it('throws on duplicate tag name', () => {
    createTag(db, { name: 'dup' });
    expect(() => createTag(db, { name: 'dup' })).toThrow('already exists');
  });

  it('renames a tag', () => {
    const tag = createTag(db, { name: 'old' });
    const renamed = renameTag(db, tag.id, { newName: 'new' });
    expect(renamed!.name).toBe('new');
    expect(getTagByName(db, 'old')).toBeNull();
  });

  it('rename throws on name conflict', () => {
    const tag = createTag(db, { name: 'a' });
    createTag(db, { name: 'b' });
    expect(() => renameTag(db, tag.id, { newName: 'b' })).toThrow('already in use');
  });

  it('mergeTags moves resources and deletes source', () => {
    const source = createTag(db, { name: 'source' });
    const target = createTag(db, { name: 'target' });
    const skill = createSkill(db, { name: 's1', tags: ['source'] });

    const result = mergeTags(db, source.id, target.id);
    expect(result).not.toBeNull();
    expect(getTag(db, source.id)).toBeNull();

    const updatedSkill = db
      .prepare(
        `SELECT t.name FROM resource_tag rt
         JOIN tag t ON t.id = rt.tag_id
         WHERE rt.resource_type = 'skill' AND rt.resource_id = ?`,
      )
      .all(skill.id) as Array<{ name: string }>;
    expect(updatedSkill.map((r) => r.name)).toEqual(['target']);
  });

  it('mergeTags returns null for non-existent tag', () => {
    const tag = createTag(db, { name: 'real' });
    expect(mergeTags(db, 'fake', tag.id)).toBeNull();
  });

  it('deletes a tag', () => {
    const tag = createTag(db, { name: 'temp' });
    expect(deleteTag(db, tag.id)).toBe(true);
    expect(getTag(db, tag.id)).toBeNull();
  });

  it('returns false deleting non-existent tag', () => {
    expect(deleteTag(db, 'nope')).toBe(false);
  });

  it('deleteTag cleans up resource_tag entries', () => {
    const tag = createTag(db, { name: 'cleanup' });
    createSkill(db, { name: 's1', tags: ['cleanup'] });
    deleteTag(db, tag.id);

    const rows = db
      .prepare("SELECT * FROM resource_tag WHERE resource_type = 'skill'")
      .all();
    expect(rows).toHaveLength(0);
  });
});
