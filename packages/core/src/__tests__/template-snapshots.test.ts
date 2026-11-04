import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadTemplates } from '../agent/template-loader.js';
import { renderMcpForAgent } from '../mcp/renderer.js';
import { validateAgentTemplate } from '../agent/template-validator.js';
import type { WsMcpSchema } from '../mcp/schema.js';

const savedEnv: Record<string, string> = {};

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

describe('Pi MCP entry dialect', () => {
  const template = loadTemplates().find((t) => t.id === 'pi')!;

  it('renders http headers with env refs for a hosted MCP server', () => {
    const httpMcp: WsMcpSchema = {
      name: 'github',
      transport: 'http',
      url: 'https://api.githubcopilot.com/mcp/',
      headers: { Authorization: 'env:GITHUB_TOKEN' },
    };
    const entry = JSON.parse(renderMcpForAgent(httpMcp, template)).mcpServers.github;
    expect(entry.url).toBe('https://api.githubcopilot.com/mcp/');
    expect(entry.headers).toEqual({ Authorization: '${env:GITHUB_TOKEN}' });
  });
});

describe('Kimi MCP entry dialect', () => {
  const template = loadTemplates().find((t) => t.id === 'kimi')!;
  const parsed = (result: string) => JSON.parse(result).mcpServers;

  it('marks sse entries with an explicit transport field', () => {
    const entry = parsed(renderMcpForAgent(sseMcp, template))['remote-server'];
    expect(entry.url).toBe('http://localhost:3000/sse');
    expect(entry.transport).toBe('sse');
  });

  it('marks http entries with an explicit transport field', () => {
    const httpMcp: WsMcpSchema = {
      name: 'github',
      transport: 'http',
      url: 'https://api.githubcopilot.com/mcp/',
    };
    const entry = parsed(renderMcpForAgent(httpMcp, template)).github;
    expect(entry.url).toBe('https://api.githubcopilot.com/mcp/');
    expect(entry.transport).toBe('http');
  });

  it('omits the transport field for stdio entries', () => {
    const entry = parsed(renderMcpForAgent(stdioMcp, template)).filesystem;
    expect(entry.command).toBe('npx');
    expect(entry).not.toHaveProperty('transport');
  });

  it('resolves env references from the process environment', () => {
    const prev = process.env.WS_KIMI_TEST_TOKEN;
    process.env.WS_KIMI_TEST_TOKEN = 'secret-value';
    try {
      const mcp: WsMcpSchema = {
        name: 'github',
        transport: 'stdio',
        command: 'npx',
        env: { GITHUB_TOKEN: 'env:WS_KIMI_TEST_TOKEN' },
      };
      const entry = parsed(renderMcpForAgent(mcp, template)).github;
      expect(entry.env).toEqual({ GITHUB_TOKEN: 'secret-value' });
    } finally {
      if (prev === undefined) delete process.env.WS_KIMI_TEST_TOKEN;
      else process.env.WS_KIMI_TEST_TOKEN = prev;
    }
  });

  it('keeps the env reference text when the variable is unset', () => {
    const prev = process.env.WS_KIMI_TEST_UNSET;
    delete process.env.WS_KIMI_TEST_UNSET;
    try {
      const mcp: WsMcpSchema = {
        name: 'github',
        transport: 'stdio',
        command: 'npx',
        env: { GITHUB_TOKEN: 'env:WS_KIMI_TEST_UNSET' },
      };
      const entry = parsed(renderMcpForAgent(mcp, template)).github;
      expect(entry.env).toEqual({ GITHUB_TOKEN: 'env:WS_KIMI_TEST_UNSET' });
    } finally {
      if (prev !== undefined) process.env.WS_KIMI_TEST_UNSET = prev;
    }
  });
});

describe('Agent template rendering snapshots', () => {
  const templates = loadTemplates();

  beforeAll(() => {
    // Kimi resolves `env:VAR` refs from process.env at render time; pin the
    // variables used by the fixture MCPs so snapshots stay deterministic.
    for (const key of ['GITHUB_TOKEN', 'API_KEY']) {
      const prev = process.env[key];
      if (prev !== undefined) {
        savedEnv[key] = prev;
        delete process.env[key];
      }
    }
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      process.env[key] = value;
    }
  });

  it('loads all 18 templates', () => {
    expect(templates.length).toBe(18);
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
