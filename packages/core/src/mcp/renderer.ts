import type { AgentTemplate, TargetFormat } from '../agent/template-types.js';
import type { WsMcpSchema } from './schema.js';
import { getRenderer } from './renderer-registry.js';

export type RenderedMcp = string;

export function renderMcpForAgent(
  mcp: WsMcpSchema,
  template: AgentTemplate,
): RenderedMcp {
  const format = template.targetFormat ?? detectFormat(template);
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
  const format = template.targetFormat ?? detectFormat(template);
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
  const format = template.targetFormat ?? detectFormat(template);
  if (format === 'json-map') {
    try {
      return JSON.parse(content);
    } catch {
      return {};
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

export function buildMcpEntry(schema: WsMcpSchema): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  if (schema.transport === 'stdio') {
    if (schema.command) entry.command = schema.command;
    if (schema.args && schema.args.length > 0) entry.args = schema.args;
  } else {
    if (schema.url) entry.url = schema.url;
  }
  if (schema.env && Object.keys(schema.env).length > 0) {
    entry.env = { ...schema.env };
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
