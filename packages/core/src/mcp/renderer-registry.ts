import type { McpRenderer } from './types.js';
import type { WsMcpSchema } from './schema.js';
import type { AgentTemplate, TargetFormat } from '../agent/template-types.js';

const renderers = new Map<string, McpRenderer>();

export function registerRenderer(format: string, renderer: McpRenderer): void {
  renderers.set(format, renderer);
}

export function getRenderer(format: string): McpRenderer | undefined {
  return renderers.get(format);
}

export function listRenderers(): string[] {
  return Array.from(renderers.keys());
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

function transformConfigEnv(
  config: Record<string, unknown>,
  formatVar: (varName: string) => string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const section: Record<string, unknown> = {};
      for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
          const entryObj = { ...(entry as Record<string, unknown>) };
          if (entryObj.env && typeof entryObj.env === 'object' && !Array.isArray(entryObj.env)) {
            const envObj: Record<string, string> = {};
            for (const [ek, ev] of Object.entries(entryObj.env as Record<string, string>)) {
              const match = typeof ev === 'string' ? ev.match(/^env:(.+)$/) : null;
              envObj[ek] = match ? formatVar(match[1]) : ev;
            }
            entryObj.env = envObj;
          }
          section[name] = entryObj;
        } else {
          section[name] = entry;
        }
      }
      result[key] = section;
    } else {
      result[key] = value;
    }
  }
  return result;
}

const jsonMapRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
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
  },

  parse(content: string, field: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(content);
      return (parsed[field] as Record<string, unknown>) ?? {};
    } catch {
      return {};
    }
  },

  serialize(config: Record<string, unknown>): string {
    const transformed = transformConfigEnv(config, (varName) => `\${env:${varName}}`);
    return JSON.stringify(transformed, null, 2) + '\n';
  },
};

const tomlTableRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
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
  },

  parse(content: string, field: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentEntry: Record<string, unknown> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        if (currentSection && currentEntry) {
          const parts = currentSection.split('.');
          if (parts.length >= 2 && parts[0] === field) {
            result[parts[1]] = currentEntry;
          }
        }
        currentSection = sectionMatch[1];
        currentEntry = {};
        continue;
      }

      if (currentEntry) {
        const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (kvMatch) {
          const [, key, value] = kvMatch;
          if (value.startsWith('[') && value.endsWith(']')) {
            currentEntry[key] = value
              .slice(1, -1)
              .split(',')
              .map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
          } else if (value.startsWith('{') && value.endsWith('}')) {
            const envObj: Record<string, string> = {};
            value
              .slice(1, -1)
              .split(',')
              .forEach((pair) => {
                const [k, v] = pair.split('=').map((s) => s.trim());
                if (k && v) {
                  envObj[k] = v.replace(/^"(.*)"$/, '$1');
                }
              });
            currentEntry[key] = envObj;
          } else {
            currentEntry[key] = value.replace(/^"(.*)"$/, '$1');
          }
        }
      }
    }

    if (currentSection && currentEntry) {
      const parts = currentSection.split('.');
      if (parts.length >= 2 && parts[0] === field) {
        result[parts[1]] = currentEntry;
      }
    }

    return result;
  },

  serialize(config: Record<string, unknown>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const entries = Object.entries(value as Record<string, unknown>);
        for (const [name, entry] of entries) {
          if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
            lines.push(`[${key}.${name}]`);
            for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
              if (k === 'env' && typeof v === 'object' && v !== null) {
                const envPairs = Object.entries(v as Record<string, string>)
                  .map(([ek, ev]) => {
                    const resolved = typeof ev === 'string' && ev.startsWith('env:') ? `"${ev.slice(4)}"` : `"${ev}"`;
                    return `${ek} = ${resolved}`;
                  })
                  .join(', ');
                lines.push(`env = { ${envPairs} }`);
              } else if (Array.isArray(v)) {
                lines.push(`${k} = [${v.map((i) => `"${i}"`).join(', ')}]`);
              } else {
                lines.push(`${k} = "${v}"`);
              }
            }
            lines.push('');
          }
        }
      } else {
        lines.push(`${key} = "${value}"`);
      }
    }

    return lines.join('\n').trimEnd() + '\n';
  },
};

registerRenderer('json-map', jsonMapRenderer);
registerRenderer('toml-table', tomlTableRenderer);

import { yamlRenderer } from './renderers/yaml-renderer.js';
registerRenderer('yaml', yamlRenderer);
