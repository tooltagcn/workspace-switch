import { describe, it, expect } from 'vitest';
import { loadTemplates } from '../agent/template-loader.js';
import { renderMcpForAgent } from '../mcp/renderer.js';
import { validateAgentTemplate } from '../agent/template-validator.js';
import type { WsMcpSchema } from '../mcp/schema.js';

const stdioMcp: WsMcpSchema = {
  name: 'filesystem',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  env: { GITHUB_TOKEN: 'env:GITHUB_TOKEN' },
};

const sseMcp: WsMcpSchema = {
  name: 'remote-server',
  transport: 'sse',
  url: 'http://localhost:3000/sse',
  env: { API_KEY: 'env:API_KEY' },
};

describe('Agent template rendering snapshots', () => {
  const templates = loadTemplates();

  it('loads all 14 templates', () => {
    expect(templates.length).toBe(14);
  });

  it('all templates pass JSON Schema validation', () => {
    for (const template of templates) {
      const result = validateAgentTemplate(template);
      expect(result.valid, `${template.id}: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  for (const template of templates) {
    describe(`${template.name} (${template.id})`, () => {
      const hasMcpSupport = template.targetFormat != null || template.mcpFile != null;

      if (hasMcpSupport) {
        it('renders stdio MCP snapshot', () => {
          const result = renderMcpForAgent(stdioMcp, template);
          expect(result).toMatchSnapshot();
        });

        it('renders SSE MCP snapshot', () => {
          const result = renderMcpForAgent(sseMcp, template);
          expect(result).toMatchSnapshot();
        });
      } else {
        it('throws when rendering MCP (no MCP support)', () => {
          expect(() => renderMcpForAgent(stdioMcp, template)).toThrow();
        });
      }
    });
  }
});
