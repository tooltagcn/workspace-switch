import { describe, it, expect, beforeEach } from 'vitest';
import { registerRenderer, getRenderer, listRenderers } from '../mcp/renderer-registry.js';
import { renderMcpForAgent } from '../mcp/renderer.js';
import type { McpRenderer } from '../mcp/types.js';
import type { WsMcpSchema } from '../mcp/schema.js';
import type { AgentTemplate, TargetFormat } from '../agent/template-types.js';

describe('Renderer Plugin System', () => {
  const testMcp: WsMcpSchema = {
    name: 'test-server',
    transport: 'stdio',
    command: 'node',
    args: ['server.js'],
    env: { API_KEY: 'env:API_KEY', DEBUG: 'true' },
  };

  const testTemplate: AgentTemplate = {
    id: 'test-agent',
    name: 'Test Agent',
    configDirName: '.test',
    mcpFile: 'config.custom',
    mcpField: 'servers',
    skillDir: null,
    icon: null,
    targetFormat: 'test-custom' as TargetFormat,
  };

  describe('Custom Renderer Registration', () => {
    it('should register and retrieve a custom renderer', () => {
      const customRenderer: McpRenderer = {
        render: (mcp, template) => `custom:${mcp.name}`,
        parse: (content, field) => ({ parsed: content }),
        serialize: (config) => JSON.stringify(config),
      };

      registerRenderer('test-custom', customRenderer);
      const retrieved = getRenderer('test-custom');

      expect(retrieved).toBe(customRenderer);
    });

    it('should list all registered renderers', () => {
      const renderers = listRenderers();
      expect(renderers).toContain('json-map');
      expect(renderers).toContain('toml-table');
      expect(renderers).toContain('yaml');
      expect(renderers).toContain('test-custom');
    });

    it('should return undefined for unregistered format', () => {
      const renderer = getRenderer('nonexistent-format');
      expect(renderer).toBeUndefined();
    });
  });

  describe('Custom Renderer Usage', () => {
    it('should use custom renderer when rendering MCP', () => {
      const customRenderer: McpRenderer = {
        render: (mcp, template) => {
          const lines = [`# Custom config for ${mcp.name}`];
          if (mcp.command) lines.push(`command=${mcp.command}`);
          if (mcp.args) lines.push(`args=${mcp.args.join(',')}`);
          return lines.join('\n') + '\n';
        },
        parse: (content, field) => ({}),
        serialize: (config) => JSON.stringify(config),
      };

      registerRenderer('test-custom-usage', customRenderer);
      const templateWithCustom = { ...testTemplate, targetFormat: 'test-custom-usage' as TargetFormat };

      const output = renderMcpForAgent(testMcp, templateWithCustom);

      expect(output).toContain('# Custom config for test-server');
      expect(output).toContain('command=node');
      expect(output).toContain('args=server.js');
    });

    it('should throw error for unregistered format', () => {
      const templateWithUnknown = { ...testTemplate, targetFormat: 'unknown-format' as TargetFormat };

      expect(() => renderMcpForAgent(testMcp, templateWithUnknown)).toThrow(
        'No renderer registered for format: unknown-format',
      );
    });
  });

  describe('Environment Variable Transformation', () => {
    it('should transform env:VAR references in custom renderer', () => {
      const customRenderer: McpRenderer = {
        render: (mcp, template) => {
          const lines: string[] = [];
          if (mcp.env) {
            for (const [key, value] of Object.entries(mcp.env)) {
              const transformed = value.replace(/^env:(.+)$/, '${$1}');
              lines.push(`${key}=${transformed}`);
            }
          }
          return lines.join('\n') + '\n';
        },
        parse: (content, field) => ({}),
        serialize: (config) => JSON.stringify(config),
      };

      registerRenderer('test-env-transform', customRenderer);
      const templateWithEnv = { ...testTemplate, targetFormat: 'test-env-transform' as TargetFormat };

      const output = renderMcpForAgent(testMcp, templateWithEnv);

      expect(output).toContain('API_KEY=${API_KEY}');
      expect(output).toContain('DEBUG=true');
    });
  });

  describe('Built-in Renderers', () => {
    it('should have json-map renderer registered', () => {
      const renderer = getRenderer('json-map');
      expect(renderer).toBeDefined();
    });

    it('should have toml-table renderer registered', () => {
      const renderer = getRenderer('toml-table');
      expect(renderer).toBeDefined();
    });

    it('should have yaml renderer registered', () => {
      const renderer = getRenderer('yaml');
      expect(renderer).toBeDefined();
    });

    it('should render JSON format correctly', () => {
      const renderer = getRenderer('json-map')!;
      const jsonTemplate = { ...testTemplate, targetFormat: 'json-map' as TargetFormat, mcpFile: 'config.json' };

      const output = renderer.render(testMcp, jsonTemplate);
      const parsed = JSON.parse(output);

      expect(parsed.servers).toBeDefined();
      expect(parsed.servers['test-server']).toBeDefined();
      expect(parsed.servers['test-server'].command).toBe('node');
      expect(parsed.servers['test-server'].args).toEqual(['server.js']);
    });

    it('should render YAML format correctly', () => {
      const renderer = getRenderer('yaml')!;
      const yamlTemplate = { ...testTemplate, targetFormat: 'yaml' as TargetFormat, mcpFile: 'config.yaml' };

      const output = renderer.render(testMcp, yamlTemplate);

      expect(output).toContain('servers:');
      expect(output).toContain('test-server:');
      expect(output).toContain('command: node');
    });
  });

  describe('Renderer Override', () => {
    it('should allow overriding existing renderer', () => {
      const originalRenderer = getRenderer('json-map');
      expect(originalRenderer).toBeDefined();

      const customJsonRenderer: McpRenderer = {
        render: (mcp, template) => `{"custom": "${mcp.name}"}`,
        parse: (content, field) => ({}),
        serialize: (config) => JSON.stringify(config),
      };

      registerRenderer('json-map', customJsonRenderer);
      const overridden = getRenderer('json-map');

      expect(overridden).toBe(customJsonRenderer);
      expect(overridden).not.toBe(originalRenderer);

      // Restore original
      registerRenderer('json-map', originalRenderer!);
    });
  });
});
