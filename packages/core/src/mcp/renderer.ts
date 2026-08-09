import type { AgentTemplate, TargetFormat } from '../agent/template-types.js';
import type { WsMcpSchema } from './schema.js';

export type RenderedMcp = string;

export function renderMcpForAgent(
  mcp: WsMcpSchema,
  template: AgentTemplate,
): RenderedMcp {
  const format = template.targetFormat ?? detectFormat(template);
  if (!format) {
    throw new Error(`Agent template "${template.id}" has no targetFormat and cannot be auto-detected`);
  }

  switch (format) {
    case 'json-map':
      return renderJsonMap(mcp, template);
    case 'toml-table':
      return renderTomlTable(mcp, template);
    default:
      throw new Error(`Unknown targetFormat: ${format}`);
  }
}

function detectFormat(template: AgentTemplate): TargetFormat | null {
  if (!template.mcpFile) return null;
  if (template.mcpFile.endsWith('.json')) return 'json-map';
  if (template.mcpFile.endsWith('.toml')) return 'toml-table';
  return null;
}

function transformEnvValue(value: string, format: TargetFormat, _agentId: string): string {
  const envMatch = value.match(/^env:(.+)$/);
  if (!envMatch) return value;

  const varName = envMatch[1];
  if (format === 'toml-table') {
    return `"${varName}"`;
  }
  return `\${env:${varName}}`;
}

function transformEnv(
  env: Record<string, string> | undefined,
  format: TargetFormat,
  agentId: string,
): Record<string, string> {
  if (!env) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transformEnvValue(value, format, agentId);
  }
  return result;
}

function renderJsonMap(mcp: WsMcpSchema, template: AgentTemplate): string {
  const entry: Record<string, unknown> = {};

  if (mcp.transport === 'stdio') {
    if (mcp.command) entry.command = mcp.command;
    if (mcp.args && mcp.args.length > 0) entry.args = mcp.args;
  } else {
    if (mcp.url) entry.url = mcp.url;
  }

  const transformedEnv = transformEnv(mcp.env, 'json-map', template.id);
  if (Object.keys(transformedEnv).length > 0) {
    entry.env = transformedEnv;
  }

  const field = template.mcpField ?? 'mcpServers';
  const wrapper = { [field]: { [mcp.name]: entry } };
  return JSON.stringify(wrapper, null, 2) + '\n';
}

function renderTomlTable(mcp: WsMcpSchema, template: AgentTemplate): string {
  const field = template.mcpField ?? 'mcpServers';
  const lines: string[] = [];

  lines.push(`[${field}.${mcp.name}]`);

  if (mcp.transport === 'stdio') {
    if (mcp.command) lines.push(`command = "${mcp.command}"`);
    if (mcp.args && mcp.args.length > 0) {
      lines.push(`args = [${mcp.args.map((a) => `"${a}"`).join(', ')}]`);
    }
  } else {
    if (mcp.url) lines.push(`url = "${mcp.url}"`);
  }

  const transformedEnv = transformEnv(mcp.env, 'toml-table', template.id);
  if (Object.keys(transformedEnv).length > 0) {
    const envPairs = Object.entries(transformedEnv)
      .map(([k, v]) => `${k} = ${v}`)
      .join(', ');
    lines.push(`env = { ${envPairs} }`);
  }

  return lines.join('\n') + '\n';
}
