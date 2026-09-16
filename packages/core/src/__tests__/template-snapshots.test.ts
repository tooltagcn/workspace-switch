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

describe('OpenCode MCP entry dialect', () => {
  const template = loadTemplates().find((t) => t.id === 'opencode')!;
  const parsed = (result: string) => JSON.parse(result).mcp;

  it('renders a bare binary command as an array', () => {
    const binaryMcp: WsMcpSchema = {
      name: 'codebase-memory',
      transport: 'stdio',
      command: '/Users/lykos/.local/bin/codebase-memory-mcp',
    };
    const entry = parsed(renderMcpForAgent(binaryMcp, template))['codebase-memory'];
    expect(entry.command).toEqual(['/Users/lykos/.local/bin/codebase-memory-mcp']);
    expect(entry.type).toBe('local');
  });

  it('emits enabled flag on every entry', () => {
    const entry = parsed(renderMcpForAgent(sseMcp, template))['remote-server'];
    expect(entry.enabled).toBe(true);
  });
});

describe('Agent template rendering snapshots', () => {
  const templates = loadTemplates();

  it('loads all 17 templates', () => {
    expect(templates.length).toBe(17);
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
