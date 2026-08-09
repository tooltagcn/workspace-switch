import type { Agent } from './types.js';
import type { AgentTemplate, EntryFormat, TargetFormat } from './template-types.js';

function detectFormatFromMcpFile(mcpFile: string | null): TargetFormat | null {
  if (!mcpFile) return null;
  if (mcpFile.endsWith('.json')) return 'json-map';
  if (mcpFile.endsWith('.toml')) return 'toml-table';
  if (mcpFile.endsWith('.yaml') || mcpFile.endsWith('.yml')) return 'yaml';
  return null;
}

function defaultEntryFormat(format: TargetFormat): EntryFormat {
  return {
    format,
    envTransform: format === 'toml-table' ? 'bare' : '${env:VAR}',
    fieldMapping: { command: 'command', args: 'args', url: 'url', env: 'env' },
  };
}

export function effectiveAsTemplate(
  agent: Agent,
  template: AgentTemplate | null,
): AgentTemplate {
  const mcpFile = agent.mcpFile ?? template?.mcpFile ?? null;
  const mcpField = agent.mcpField ?? template?.mcpField ?? null;
  const targetFormat: TargetFormat | null = (agent.targetFormat as TargetFormat | null) ?? template?.targetFormat ?? detectFormatFromMcpFile(mcpFile);
  const envTransform = agent.envTransform ?? template?.entryFormat?.envTransform ?? null;
  const fieldMapping = agent.fieldMapping ?? template?.entryFormat?.fieldMapping ?? null;

  let entryFormat: EntryFormat | undefined;
  if (targetFormat) {
    entryFormat = {
      format: targetFormat,
      envTransform: envTransform ?? (targetFormat === 'toml-table' ? 'bare' : '${env:VAR}'),
      fieldMapping: fieldMapping ?? { command: 'command', args: 'args', url: 'url', env: 'env' },
    };
  }

  return {
    id: agent.id,
    name: agent.name,
    configDirName: agent.configDirName,
    mcpFile,
    mcpField,
    skillDir: agent.skillDir ?? template?.skillDir ?? null,
    icon: template?.icon ?? null,
    targetFormat: targetFormat ?? undefined,
    entryFormat,
  };
}
