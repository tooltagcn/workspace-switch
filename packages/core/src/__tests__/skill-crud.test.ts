import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  addTag,
  removeTag,
  setTags,
} from '../skill/manager.js';

describe('Skill CRUD', () => {
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

  it('creates a skill', () => {
    const skill = createSkill(db, { name: 'my-skill', description: 'A test skill' });
    expect(skill.id).toBeDefined();
    expect(skill.name).toBe('my-skill');
    expect(skill.description).toBe('A test skill');
    expect(skill.tags).toEqual([]);
  });

  it('lists skills', () => {
    createSkill(db, { name: 'alpha' });
    createSkill(db, { name: 'beta' });
    const skills = listSkills(db);
    expect(skills).toHaveLength(2);
    expect(skills[0].name).toBe('alpha');
    expect(skills[1].name).toBe('beta');
  });

  it('gets a skill by id', () => {
    const created = createSkill(db, { name: 'test' });
    const fetched = getSkill(db, created.id);
    expect(fetched).toEqual(created);
  });

  it('returns null for non-existent skill', () => {
    expect(getSkill(db, 'nonexistent')).toBeNull();
  });

  it('updates a skill', () => {
    const skill = createSkill(db, { name: 'old', description: 'old desc' });
    const updated = updateSkill(db, skill.id, { name: 'new', description: 'new desc' });
    expect(updated!.name).toBe('new');
    expect(updated!.description).toBe('new desc');
  });

  it('deletes a skill', () => {
    const skill = createSkill(db, { name: 'temp' });
    expect(deleteSkill(db, skill.id)).toBe(true);
    expect(getSkill(db, skill.id)).toBeNull();
  });

  it('returns false when deleting non-existent skill', () => {
    expect(deleteSkill(db, 'nonexistent')).toBe(false);
  });

  it('supports custom id', () => {
    const skill = createSkill(db, { id: 'custom-id', name: 'custom' });
    expect(skill.id).toBe('custom-id');
  });

  it('enforces unique name', () => {
    createSkill(db, { name: 'unique' });
    expect(() => createSkill(db, { name: 'unique' })).toThrow();
  });
});

describe('Skill tags', () => {
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

  it('creates a skill with tags', () => {
    const skill = createSkill(db, { name: 'tagged', tags: ['frontend', 'react'] });
    expect(skill.tags).toEqual(['frontend', 'react']);
  });

  it('adds a tag', () => {
    const skill = createSkill(db, { name: 's1' });
    const updated = addTag(db, skill.id, 'typescript');
    expect(updated.tags).toEqual(['typescript']);
  });

  it('removes a tag', () => {
    const skill = createSkill(db, { name: 's1', tags: ['a', 'b', 'c'] });
    const updated = removeTag(db, skill.id, 'b');
    expect(updated.tags).toEqual(['a', 'c']);
  });

  it('sets tags (replaces all)', () => {
    const skill = createSkill(db, { name: 's1', tags: ['a', 'b'] });
    const updated = setTags(db, skill.id, ['x', 'y', 'z']);
    expect(updated.tags).toEqual(['x', 'y', 'z']);
  });

  it('filters skills by tag', () => {
    createSkill(db, { name: 'react-app', tags: ['frontend', 'react'] });
    createSkill(db, { name: 'node-api', tags: ['backend', 'node'] });
    createSkill(db, { name: 'vue-app', tags: ['frontend', 'vue'] });

    const frontend = listSkills(db, { tags: ['frontend'] });
    expect(frontend).toHaveLength(2);
    expect(frontend.map((s) => s.name).sort()).toEqual(['react-app', 'vue-app']);
  });

  it('filters skills by multiple tags (OR)', () => {
    createSkill(db, { name: 'react-app', tags: ['react'] });
    createSkill(db, { name: 'node-api', tags: ['node'] });
    createSkill(db, { name: 'vue-app', tags: ['vue'] });

    const result = listSkills(db, { tags: ['react', 'node'] });
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name).sort()).toEqual(['node-api', 'react-app']);
  });

  it('returns empty for tag filter with no matches', () => {
    createSkill(db, { name: 's1', tags: ['a'] });
    expect(listSkills(db, { tags: ['nonexistent'] })).toEqual([]);
  });

  it('addTag throws for non-existent skill', () => {
    expect(() => addTag(db, 'nonexistent', 'tag')).toThrow('Skill not found');
  });

  it('removeTag throws for non-existent skill', () => {
    expect(() => removeTag(db, 'nonexistent', 'tag')).toThrow('Skill not found');
  });

  it('setTags throws for non-existent skill', () => {
    expect(() => setTags(db, 'nonexistent', ['tag'])).toThrow('Skill not found');
  });

  it('deleteSkill cleans up tags', () => {
    const skill = createSkill(db, { name: 's1', tags: ['a', 'b'] });
    deleteSkill(db, skill.id);
    const newSkill = createSkill(db, { id: skill.id, name: 's1-reborn', tags: ['c'] });
    expect(newSkill.tags).toEqual(['c']);
  });
});
