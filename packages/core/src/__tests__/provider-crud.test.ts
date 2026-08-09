import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import {
  listProviders,
  getProvider,
  getProviderByName,
  createProvider,
  updateProvider,
  deleteProvider,
  setApiKeyRef,
} from '../provider/manager.js';

describe('Provider CRUD', () => {
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

  it('creates a provider', () => {
    const provider = createProvider(db, {
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4',
      models: ['gpt-4', 'gpt-3.5-turbo'],
    });
    expect(provider.id).toBeDefined();
    expect(provider.name).toBe('openai');
    expect(provider.baseUrl).toBe('https://api.openai.com/v1');
    expect(provider.defaultModel).toBe('gpt-4');
    expect(provider.models).toEqual(['gpt-4', 'gpt-3.5-turbo']);
    expect(provider.apiKeyRef).toBeNull();
  });

  it('lists providers', () => {
    createProvider(db, { name: 'anthropic' });
    createProvider(db, { name: 'openai' });
    const providers = listProviders(db);
    expect(providers).toHaveLength(2);
    expect(providers[0].name).toBe('anthropic');
    expect(providers[1].name).toBe('openai');
  });

  it('gets a provider by id', () => {
    const created = createProvider(db, { name: 'test' });
    const fetched = getProvider(db, created.id);
    expect(fetched).toEqual(created);
  });

  it('gets a provider by name', () => {
    createProvider(db, { name: 'deepseek' });
    const fetched = getProviderByName(db, 'deepseek');
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('deepseek');
  });

  it('returns null for non-existent provider', () => {
    expect(getProvider(db, 'nonexistent')).toBeNull();
    expect(getProviderByName(db, 'nonexistent')).toBeNull();
  });

  it('updates a provider', () => {
    const provider = createProvider(db, { name: 'old', baseUrl: 'https://old.com' });
    const updated = updateProvider(db, provider.id, {
      name: 'new',
      baseUrl: 'https://new.com',
    });
    expect(updated!.name).toBe('new');
    expect(updated!.baseUrl).toBe('https://new.com');
  });

  it('updates models array', () => {
    const provider = createProvider(db, { name: 'test', models: ['a'] });
    const updated = updateProvider(db, provider.id, { models: ['a', 'b', 'c'] });
    expect(updated!.models).toEqual(['a', 'b', 'c']);
  });

  it('deletes a provider', () => {
    const provider = createProvider(db, { name: 'temp' });
    expect(deleteProvider(db, provider.id)).toBe(true);
    expect(getProvider(db, provider.id)).toBeNull();
  });

  it('returns false when deleting non-existent provider', () => {
    expect(deleteProvider(db, 'nonexistent')).toBe(false);
  });

  it('enforces unique name', () => {
    createProvider(db, { name: 'unique' });
    expect(() => createProvider(db, { name: 'unique' })).toThrow();
  });

  it('sets api key ref', () => {
    const provider = createProvider(db, { name: 'test' });
    const updated = setApiKeyRef(db, provider.id, 'keychain-ref-123');
    expect(updated.apiKeyRef).toBe('keychain-ref-123');
  });

  it('filters providers by name', () => {
    createProvider(db, { name: 'openai' });
    createProvider(db, { name: 'anthropic' });
    createProvider(db, { name: 'deepseek' });
    const filtered = listProviders(db, { name: 'open' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('openai');
  });

  it('creates provider with empty models', () => {
    const provider = createProvider(db, { name: 'test' });
    expect(provider.models).toEqual([]);
  });

  it('supports custom id', () => {
    const provider = createProvider(db, { id: 'custom-id', name: 'custom' });
    expect(provider.id).toBe('custom-id');
  });
});
