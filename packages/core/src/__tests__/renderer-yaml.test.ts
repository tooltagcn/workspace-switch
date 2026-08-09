import { describe, it, expect } from 'vitest';
import { yamlRenderer } from '../mcp/renderers/yaml-renderer.js';
import type { WsMcpSchema } from '../mcp/schema.js';
import type { AgentTemplate } from '../agent/template-types.js';

describe('YAML renderer round-trip', () => {
  const template: AgentTemplate = {
    id: 'test-yaml',
    name: 'Test YAML',
    configDirName: '.test',
    mcpFile: 'config.yaml',
    mcpField: 'mcpServers',
    skillDir: 'skills',
    icon: 'test',
    targetFormat: 'yaml',
  };

  it('round-trips a stdio MCP entry without data loss', () => {
    const mcp: WsMcpSchema = {
      name: 'testserver',
      transport: 'stdio',
      command: 'npx',
      env: { API_KEY: 'env:MY_API_KEY', DEBUG: 'true' },
    };

    const rendered = yamlRenderer.render(mcp, template);
    const parsed = yamlRenderer.parse(rendered, 'mcpServers');

    expect(parsed['testserver']).toBeDefined();
    const entry = parsed['testserver'] as Record<string, unknown>;
    expect(entry.command).toBe('npx');
    expect(entry.env).toEqual({ API_KEY: '${env:MY_API_KEY}', DEBUG: 'true' });
  });

  it('round-trips an SSE MCP entry', () => {
    const mcp: WsMcpSchema = {
      name: 'ssexserver',
      transport: 'sse',
      url: 'http://localhost:3000',
    };

    const rendered = yamlRenderer.render(mcp, template);
    const parsed = yamlRenderer.parse(rendered, 'mcpServers');

    expect(parsed['ssexserver']).toBeDefined();
    const entry = parsed['ssexserver'] as Record<string, unknown>;
    expect(entry.url).toBe('http://localhost:3000');
  });

  it('serialize produces valid YAML from config object', () => {
    const config = {
      mcpServers: {
        'my-server': {
          command: 'node',
          args: ['server.js'],
          env: { TOKEN: '${env:MY_TOKEN}' },
        },
      },
      otherKey: 'otherValue',
    };

    const serialized = yamlRenderer.serialize(config);
    expect(serialized).toContain('mcpServers:');
    expect(serialized).toContain('my-server:');
    expect(serialized).toContain('command: node');
    expect(serialized).toContain('otherKey: otherValue');
  });
});
