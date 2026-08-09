import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../db/migrate.js';
import { createProvider } from '../provider/manager.js';
import { applyProviderToAgent, getProviderForAgent } from '../provider/apply.js';

describe('Provider Apply', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    db.prepare(
      "INSERT INTO agent (id, name, config_dir_name) VALUES ('agent-1', 'Test Agent', 'test-agent')",
    ).run();
  });

  afterEach(() => {
    db.close();
  });

  it('applies a provider to an agent', () => {
    const provider = createProvider(db, { name: 'openai' });
    const result = applyProviderToAgent(db, provider.id, 'agent-1');
    expect(result.provider.name).toBe('openai');
    expect(result.agentId).toBe('agent-1');
    expect(result.appliedAt).toBeDefined();
  });

  it('retrieves provider for an agent', () => {
    const provider = createProvider(db, { name: 'anthropic' });
    applyProviderToAgent(db, provider.id, 'agent-1');
    const fetched = getProviderForAgent(db, 'agent-1');
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('anthropic');
  });

  it('returns null when no provider applied', () => {
    expect(getProviderForAgent(db, 'agent-1')).toBeNull();
  });

  it('throws for non-existent provider', () => {
    expect(() => applyProviderToAgent(db, 'bad-id', 'agent-1')).toThrow('Provider not found');
  });

  it('throws for non-existent agent', () => {
    const provider = createProvider(db, { name: 'test' });
    expect(() => applyProviderToAgent(db, provider.id, 'bad-id')).toThrow('Agent not found');
  });

  it('replaces previous provider', () => {
    const p1 = createProvider(db, { name: 'openai' });
    const p2 = createProvider(db, { name: 'anthropic' });
    applyProviderToAgent(db, p1.id, 'agent-1');
    applyProviderToAgent(db, p2.id, 'agent-1');
    const current = getProviderForAgent(db, 'agent-1');
    expect(current!.name).toBe('anthropic');
  });
});
