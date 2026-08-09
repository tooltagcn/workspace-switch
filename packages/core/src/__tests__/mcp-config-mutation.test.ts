import { describe, it, expect } from 'vitest';
import { mutateConfig } from '../mcp/mutation.js';

describe('mutateConfig', () => {
  it('adds to empty config', () => {
    const result = mutateConfig({}, 'mcpServers', {
      type: 'add',
      name: 'test',
      entry: { command: 'npx', args: ['-y', 'test'] },
    });
    expect(result).toEqual({
      mcpServers: { test: { command: 'npx', args: ['-y', 'test'] } },
    });
  });

  it('adds to config with existing entries', () => {
    const config = {
      mcpServers: { existing: { command: 'node' } },
    };
    const result = mutateConfig(config, 'mcpServers', {
      type: 'add',
      name: 'new',
      entry: { command: 'npx' },
    });
    expect(result).toEqual({
      mcpServers: {
        existing: { command: 'node' },
        new: { command: 'npx' },
      },
    });
  });

  it('replaces entry with duplicate name (update semantics)', () => {
    const config = {
      mcpServers: { test: { command: 'old' } },
    };
    const result = mutateConfig(config, 'mcpServers', {
      type: 'add',
      name: 'test',
      entry: { command: 'new' },
    });
    expect(result).toEqual({
      mcpServers: { test: { command: 'new' } },
    });
  });

  it('removes existing entry and preserves siblings', () => {
    const config = {
      mcpServers: {
        keep: { command: 'node' },
        remove: { command: 'old' },
      },
    };
    const result = mutateConfig(config, 'mcpServers', {
      type: 'remove',
      name: 'remove',
    });
    expect(result).toEqual({
      mcpServers: { keep: { command: 'node' } },
    });
  });

  it('remove is no-op for non-existent entry', () => {
    const config = {
      mcpServers: { existing: { command: 'node' } },
    };
    const result = mutateConfig(config, 'mcpServers', {
      type: 'remove',
      name: 'missing',
    });
    expect(result).toEqual({
      mcpServers: { existing: { command: 'node' } },
    });
  });

  it('remove is no-op for empty config', () => {
    const config = {};
    const result = mutateConfig(config, 'mcpServers', {
      type: 'remove',
      name: 'missing',
    });
    expect(result).toEqual({ mcpServers: {} });
  });

  it('add preserves non-MCP top-level keys', () => {
    const config = { other: 'data', theme: 'dark' };
    const result = mutateConfig(config, 'mcpServers', {
      type: 'add',
      name: 'test',
      entry: { command: 'npx' },
    });
    expect(result.other).toBe('data');
    expect(result.theme).toBe('dark');
    expect(result.mcpServers).toEqual({ test: { command: 'npx' } });
  });

  it('remove preserves non-MCP top-level keys', () => {
    const config = {
      other: 'data',
      mcpServers: { test: { command: 'npx' } },
    };
    const result = mutateConfig(config, 'mcpServers', {
      type: 'remove',
      name: 'test',
    });
    expect(result.other).toBe('data');
    expect(result.mcpServers).toEqual({});
  });

  it('does not mutate the input config', () => {
    const config = {
      mcpServers: { existing: { command: 'node' } },
      other: 'value',
    };
    const original = JSON.parse(JSON.stringify(config));
    mutateConfig(config, 'mcpServers', {
      type: 'add',
      name: 'new',
      entry: { command: 'npx' },
    });
    expect(config).toEqual(original);
  });
});
