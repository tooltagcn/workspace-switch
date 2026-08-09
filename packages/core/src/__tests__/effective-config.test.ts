import { describe, it, expect } from 'vitest';
import { effectiveAsTemplate } from '../agent/effective-config.js';
import type { Agent } from '../agent/types.js';
import type { AgentTemplate } from '../agent/template-types.js';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    builtin: false,
    configDirName: '.test',
    userRoot: null,
    projectRoot: null,
    projectEnabled: false,
    mcpFile: null,
    mcpField: null,
    skillDir: null,
    enabled: true,
    detectedAt: null,
    templateId: null,
    mcpConfigPath: null,
    targetFormat: null,
    envTransform: null,
    fieldMapping: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const jsonTemplate: AgentTemplate = {
  id: 'claude-code',
  name: 'Claude Code',
  configDirName: '.claude',
  mcpFile: 'settings.json',
  mcpField: 'mcpServers',
  skillDir: 'commands',
  icon: 'claude',
  targetFormat: 'json-map',
  entryFormat: {
    format: 'json-map',
    envTransform: '${env:VAR}',
    fieldMapping: { command: 'command', args: 'args', url: 'url', env: 'env' },
  },
};

const tomlTemplate: AgentTemplate = {
  id: 'codex',
  name: 'Codex',
  configDirName: '.agents',
  mcpFile: 'config.toml',
  mcpField: 'mcp_servers',
  skillDir: 'skills',
  icon: 'codex',
  targetFormat: 'toml-table',
  entryFormat: {
    format: 'toml-table',
    envTransform: 'bare',
    fieldMapping: { command: 'command', args: 'args', url: 'url', env: 'env' },
  },
};

describe('effectiveAsTemplate', () => {
  it('uses agent values when present', () => {
    const agent = makeAgent({
      mcpFile: 'custom.json',
      mcpField: 'customField',
      targetFormat: 'json-map',
      envTransform: 'bare',
      fieldMapping: { command: 'cmd', args: 'arguments', url: 'endpoint', env: 'environment' },
    });
    const result = effectiveAsTemplate(agent, jsonTemplate);

    expect(result.mcpFile).toBe('custom.json');
    expect(result.mcpField).toBe('customField');
    expect(result.targetFormat).toBe('json-map');
    expect(result.entryFormat?.envTransform).toBe('bare');
    expect(result.entryFormat?.fieldMapping).toEqual({
      command: 'cmd', args: 'arguments', url: 'endpoint', env: 'environment',
    });
  });

  it('falls through to template when agent values are null', () => {
    const agent = makeAgent();
    const result = effectiveAsTemplate(agent, jsonTemplate);

    expect(result.mcpFile).toBe('settings.json');
    expect(result.mcpField).toBe('mcpServers');
    expect(result.targetFormat).toBe('json-map');
    expect(result.entryFormat?.envTransform).toBe('${env:VAR}');
    expect(result.entryFormat?.fieldMapping).toEqual({
      command: 'command', args: 'args', url: 'url', env: 'env',
    });
  });

  it('handles null template gracefully', () => {
    const agent = makeAgent({ mcpFile: 'own.json', mcpField: 'ownField' });
    const result = effectiveAsTemplate(agent, null);

    expect(result.mcpFile).toBe('own.json');
    expect(result.mcpField).toBe('ownField');
    expect(result.targetFormat).toBe('json-map');
    expect(result.id).toBe('test-agent');
    expect(result.configDirName).toBe('.test');
  });

  it('auto-detects format from mcpFile extension when no explicit format', () => {
    const agent = makeAgent({ mcpFile: 'config.toml' });
    const result = effectiveAsTemplate(agent, null);

    expect(result.targetFormat).toBe('toml-table');
    expect(result.entryFormat?.format).toBe('toml-table');
    expect(result.entryFormat?.envTransform).toBe('bare');
  });

  it('auto-detects yaml format', () => {
    const agent = makeAgent({ mcpFile: 'settings.yaml' });
    const result = effectiveAsTemplate(agent, null);

    expect(result.targetFormat).toBe('yaml');
  });

  it('agent overrides template mcpFile but uses template format', () => {
    const agent = makeAgent({ mcpFile: 'custom.json' });
    const result = effectiveAsTemplate(agent, tomlTemplate);

    expect(result.mcpFile).toBe('custom.json');
    expect(result.mcpField).toBe('mcp_servers');
    expect(result.targetFormat).toBe('toml-table');
  });

  it('uses agent id and name in result', () => {
    const agent = makeAgent({ id: 'my-agent', name: 'My Agent' });
    const result = effectiveAsTemplate(agent, jsonTemplate);

    expect(result.id).toBe('my-agent');
    expect(result.name).toBe('My Agent');
  });

  it('preserves skillDir from template when agent has none', () => {
    const agent = makeAgent();
    const result = effectiveAsTemplate(agent, jsonTemplate);

    expect(result.skillDir).toBe('commands');
  });

  it('uses agent skillDir when present', () => {
    const agent = makeAgent({ skillDir: 'custom-skills' });
    const result = effectiveAsTemplate(agent, jsonTemplate);

    expect(result.skillDir).toBe('custom-skills');
  });

  it('fieldMapping JSON roundtrip through agent', () => {
    const customMapping = { command: 'exec', args: 'params', url: 'uri', env: 'vars' };
    const agent = makeAgent({ fieldMapping: customMapping });
    const result = effectiveAsTemplate(agent, jsonTemplate);

    expect(result.entryFormat?.fieldMapping).toEqual(customMapping);
  });
});
