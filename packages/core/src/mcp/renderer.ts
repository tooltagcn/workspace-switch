import type { AgentTemplate, TargetFormat } from '../agent/template-types.js';
import type { WsMcpSchema } from './schema.js';
import { getRenderer } from './renderer-registry.js';

export type RenderedMcp = string;

function resolveFormat(template: AgentTemplate): TargetFormat | null {
  if (template.entryFormat) return template.entryFormat.format;
  return template.targetFormat ?? detectFormat(template);
}

export function renderMcpForAgent(
  mcp: WsMcpSchema,
  template: AgentTemplate,
): RenderedMcp {
  const format = resolveFormat(template);
  if (!format) {
    throw new Error(`Agent template "${template.id}" has no targetFormat and cannot be auto-detected`);
  }

  const renderer = getRenderer(format);
  if (!renderer) {
    throw new Error(`No renderer registered for format: ${format}`);
  }

  return renderer.render(mcp, template);
}

export function getRendererForTemplate(template: AgentTemplate) {
  const format = resolveFormat(template);
  if (!format) {
    throw new Error(`Agent template "${template.id}" has no targetFormat and cannot be auto-detected`);
  }
  const renderer = getRenderer(format);
  if (!renderer) {
    throw new Error(`No renderer registered for format: ${format}`);
  }
  return renderer;
}

export function parseConfigFile(content: string, template: AgentTemplate): Record<string, unknown> {
  const format = resolveFormat(template);
  if (format === 'json-map') {
    try {
      return JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse config file as JSON for template "${template.id}". The file may be corrupted or contain invalid JSON.`);
    }
  }
  const renderer = getRendererForTemplate(template);
  const field = template.mcpField ?? 'mcpServers';
  const section = renderer.parse(content, field);
  return { [field]: section };
}

export function serializeConfigFile(config: Record<string, unknown>, template: AgentTemplate): string {
  const renderer = getRendererForTemplate(template);
  return renderer.serialize(config);
}

export function buildMcpEntry(
  schema: WsMcpSchema,
  fieldMapping?: Record<string, string>,
): Record<string, unknown> {
  const map = fieldMapping ?? { command: 'command', args: 'args', url: 'url', env: 'env' };
  const entry: Record<string, unknown> = {};
  if (schema.transport === 'stdio') {
    if (schema.command) entry[map.command ?? 'command'] = schema.command;
    if (schema.args && schema.args.length > 0) entry[map.args ?? 'args'] = schema.args;
  } else {
    if (schema.url) entry[map.url ?? 'url'] = schema.url;
  }
  if (schema.env && Object.keys(schema.env).length > 0) {
    entry[map.env ?? 'env'] = { ...schema.env };
  }
  return entry;
}

function detectFormat(template: AgentTemplate): TargetFormat | null {
  if (!template.mcpFile) return null;
  if (template.mcpFile.endsWith('.json')) return 'json-map';
  if (template.mcpFile.endsWith('.toml')) return 'toml-table';
  if (template.mcpFile.endsWith('.yaml') || template.mcpFile.endsWith('.yml')) return 'yaml';
  return null;
}
