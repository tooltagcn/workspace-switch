import { describe, it, expect } from 'vitest';
import { validateWsSchema } from '../mcp/schema.js';
import type { WsMcpSchema } from '../mcp/schema.js';

describe('validateWsSchema', () => {
  it('passes for valid stdio schema', () => {
    const schema: WsMcpSchema = {
      name: 'my-server',
      transport: 'stdio',
      command: 'npx',
      args: ['mcp-server'],
    };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('passes for valid sse schema', () => {
    const schema: WsMcpSchema = {
      name: 'sse-server',
      transport: 'sse',
      url: 'http://localhost:3000/sse',
    };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(true);
  });

  it('passes for valid http schema', () => {
    const schema: WsMcpSchema = {
      name: 'http-server',
      transport: 'http',
      url: 'http://localhost:3000/mcp',
    };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(true);
  });

  it('fails when name is missing', () => {
    const schema = { name: '', transport: 'stdio' as const, command: 'cmd' };
    const result = validateWsSchema(schema as WsMcpSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([{ field: 'name', message: 'name is required' }]);
  });

  it('fails when transport is invalid', () => {
    const schema = { name: 'test', transport: 'invalid' as any };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'transport')).toBe(true);
  });

  it('fails when stdio transport missing command', () => {
    const schema: WsMcpSchema = { name: 'test', transport: 'stdio' };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'command', message: 'command is required for stdio transport' },
    ]);
  });

  it('fails when sse transport missing url', () => {
    const schema: WsMcpSchema = { name: 'test', transport: 'sse' };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'url', message: 'url is required for sse/http transport' },
    ]);
  });

  it('fails when http transport missing url', () => {
    const schema: WsMcpSchema = { name: 'test', transport: 'http' };
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'url', message: 'url is required for sse/http transport' },
    ]);
  });

  it('collects multiple errors', () => {
    const schema = { name: '', transport: 'invalid' as any } as WsMcpSchema;
    const result = validateWsSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
