import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { saveMcpToWorkspace, loadMcpFromWorkspace, listMcpFromWorkspace } from '../mcp/storage.js';
import type { WsMcpSchema } from '../mcp/schema.js';

describe('MCP workspace storage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-mcp-storage-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sampleSchema: WsMcpSchema = {
    name: 'test-server',
    transport: 'stdio',
    command: 'npx',
    args: ['mcp-server'],
    env: { API_KEY: 'secret' },
    description: 'A test server',
  };

  it('saves and loads an MCP schema', () => {
    saveMcpToWorkspace(tmpDir, sampleSchema);
    const loaded = loadMcpFromWorkspace(tmpDir, 'test-server');
    expect(loaded).toEqual(sampleSchema);
  });

  it('returns null for non-existent MCP', () => {
    expect(loadMcpFromWorkspace(tmpDir, 'nonexistent')).toBeNull();
  });

  it('lists all MCP schemas', () => {
    saveMcpToWorkspace(tmpDir, sampleSchema);
    saveMcpToWorkspace(tmpDir, { name: 'other', transport: 'sse', url: 'http://localhost:3000' });

    const list = listMcpFromWorkspace(tmpDir);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.name).sort()).toEqual(['other', 'test-server']);
  });

  it('returns empty list when mcp dir does not exist', () => {
    expect(listMcpFromWorkspace(tmpDir)).toEqual([]);
  });

  it('overwrites existing file on save', () => {
    saveMcpToWorkspace(tmpDir, sampleSchema);
    const updated = { ...sampleSchema, description: 'updated' };
    saveMcpToWorkspace(tmpDir, updated);
    const loaded = loadMcpFromWorkspace(tmpDir, 'test-server');
    expect(loaded!.description).toBe('updated');
  });
});
