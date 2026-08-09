import { describe, it, expect } from 'vitest';
import { renderMcpForAgent } from '../mcp/renderer.js';
import type { AgentTemplate } from '../agent/template-types.js';
import type { WsMcpSchema } from '../mcp/schema.js';

const claudeTemplate: AgentTemplate = {
  id: 'claude-code',
  name: 'Claude Code',
  configDirName: '.claude',
  mcpFile: 'settings.json',
  mcpField: 'mcpServers',
  skillDir: 'commands',
  icon: 'claude',
  targetFormat: 'json-map',
};

const codexTemplate: AgentTemplate = {
  id: 'codex',
  name: 'Codex',
  configDirName: '.agents',
  mcpFile: 'config.toml',
  mcpField: 'mcp_servers',
  skillDir: 'skills',
  icon: 'codex',
  targetFormat: 'toml-table',
};

const cursorTemplate: AgentTemplate = {
  id: 'cursor',
  name: 'Cursor',
  configDirName: '.cursor',
  mcpFile: 'settings.json',
  mcpField: 'mcpServers',
  skillDir: null,
  icon: 'cursor',
  targetFormat: 'json-map',
};

const copilotTemplate: AgentTemplate = {
  id: 'copilot',
  name: 'GitHub Copilot',
  configDirName: '.github-copilot',
  mcpFile: null,
  mcpField: null,
  skillDir: null,
  icon: 'copilot',
};

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

describe('renderMcpForAgent', () => {
  describe('Claude Code (json-map)', () => {
    it('renders stdio MCP server', () => {
      const result = renderMcpForAgent(stdioMcp, claudeTemplate);
      expect(result).toMatchSnapshot();
    });

    it('renders SSE MCP server', () => {
      const result = renderMcpForAgent(sseMcp, claudeTemplate);
      expect(result).toMatchSnapshot();
    });

    it('transforms env:X to ${env:X}', () => {
      const result = renderMcpForAgent(stdioMcp, claudeTemplate);
      expect(result).toContain('${env:GITHUB_TOKEN}');
    });
  });

  describe('Codex (toml-table)', () => {
    it('renders stdio MCP server', () => {
      const result = renderMcpForAgent(stdioMcp, codexTemplate);
      expect(result).toMatchSnapshot();
    });

    it('renders SSE MCP server', () => {
      const result = renderMcpForAgent(sseMcp, codexTemplate);
      expect(result).toMatchSnapshot();
    });

    it('transforms env:X to "${X}"', () => {
      const result = renderMcpForAgent(stdioMcp, codexTemplate);
      expect(result).toContain('GITHUB_TOKEN = "GITHUB_TOKEN"');
    });
  });

  describe('Cursor (json-map)', () => {
    it('renders stdio MCP server', () => {
      const result = renderMcpForAgent(stdioMcp, cursorTemplate);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Copilot (no MCP support)', () => {
    it('throws when no targetFormat and no mcpFile', () => {
      expect(() => renderMcpForAgent(stdioMcp, copilotTemplate)).toThrow();
    });
  });

  describe('env transformation', () => {
    it('leaves non-env values unchanged', () => {
      const mcp: WsMcpSchema = {
        name: 'test',
        transport: 'stdio',
        command: 'cmd',
        env: { PLAIN: 'plain-value' },
      };
      const result = renderMcpForAgent(mcp, claudeTemplate);
      expect(result).toContain('plain-value');
    });

    it('handles empty env', () => {
      const mcp: WsMcpSchema = {
        name: 'test',
        transport: 'stdio',
        command: 'cmd',
      };
      const result = renderMcpForAgent(mcp, claudeTemplate);
      expect(result).not.toContain('env');
    });
  });
});
