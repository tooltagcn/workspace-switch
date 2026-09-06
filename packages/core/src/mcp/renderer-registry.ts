import type { McpRenderer } from './types.js';
import type { WsMcpSchema } from './schema.js';
import type { AgentTemplate, EntryFormat } from '../agent/template-types.js';

const renderers = new Map<string, McpRenderer>();

export function buildMcpEntry(
  schema: WsMcpSchema,
  entryFormat?: EntryFormat,
): Record<string, unknown> {
  const map = entryFormat?.fieldMapping ?? { command: 'command', args: 'args', url: 'url', env: 'env' };
  const mergeArgs = entryFormat?.mergeArgs ?? false;
  const commandArray = entryFormat?.commandArray ?? false;
  const typeByTransport = entryFormat?.typeByTransport;
  const staticEntryFields = entryFormat?.staticEntryFields;
  const entry: Record<string, unknown> = {};

  if (schema.transport === 'stdio') {
    if (schema.command) {
      const commandKey = map.command ?? 'command';
      if (commandArray) {
        entry[commandKey] = [schema.command, ...(schema.args ?? [])];
      } else if (mergeArgs && schema.args && schema.args.length > 0) {
        entry[commandKey] = [schema.command, ...schema.args];
      } else {
        entry[commandKey] = schema.command;
        if (schema.args && schema.args.length > 0) entry[map.args ?? 'args'] = schema.args;
      }
    }
  } else {
    if (schema.url) entry[map.url ?? 'url'] = schema.url;
  }

  if (staticEntryFields) {
    Object.assign(entry, staticEntryFields);
  }

  const type = typeByTransport?.[schema.transport];
  if (type) entry.type = type;

  if (schema.env && Object.keys(schema.env).length > 0) {
    entry[map.env ?? 'env'] = { ...schema.env };
  }
  return entry;
}

export function registerRenderer(format: string, renderer: McpRenderer): void {
  renderers.set(format, renderer);
}

export function getRenderer(format: string): McpRenderer | undefined {
  return renderers.get(format);
}

export function listRenderers(): string[] {
  return Array.from(renderers.keys());
}

function transformEnvValue(value: string, envTransform: string): string {
  const envMatch = value.match(/^env:(.+)$/);
  if (!envMatch) return value;

  const varName = envMatch[1];
  if (envTransform === 'bare') {
    return `"${varName}"`;
  }
  return envTransform.replace('VAR', varName);
}

function transformEnv(
  env: Record<string, string> | undefined,
  envTransform: string,
): Record<string, string> {
  if (!env) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transformEnvValue(value, envTransform);
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

function fieldName(template: AgentTemplate, internal: string): string {
  return template.entryFormat?.fieldMapping?.[internal] ?? internal;
}

const jsonMapRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
    const entry = buildMcpEntry(mcp, template.entryFormat);

    const envKey = fieldName(template, 'env') ?? 'env';
    const rawEnv = entry[envKey];
    if (rawEnv && typeof rawEnv === 'object' && !Array.isArray(rawEnv)) {
      entry[envKey] = transformEnv(
        rawEnv as Record<string, string>,
        template.entryFormat?.envTransform ?? '${env:VAR}',
      );
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

  serialize(config: Record<string, unknown>, template?: AgentTemplate): string {
    const envTransform = template?.entryFormat?.envTransform ?? '${env:VAR}';
    const formatVar = (varName: string): string =>
      envTransform === 'bare' ? `"${varName}"` : envTransform.replace('VAR', varName);
    const transformed = transformConfigEnv(config, formatVar);
    return JSON.stringify(transformed, null, 2) + '\n';
  },
};

const tomlTableRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
    const field = template.mcpField ?? 'mcpServers';
    const lines: string[] = [];

    lines.push(`[${field}.${mcp.name}]`);

    if (mcp.transport === 'stdio') {
      if (mcp.command) lines.push(`${fieldName(template, 'command')} = "${mcp.command}"`);
      if (mcp.args && mcp.args.length > 0) {
        lines.push(`${fieldName(template, 'args')} = [${mcp.args.map((a) => `"${a}"`).join(', ')}]`);
      }
    } else {
      if (mcp.url) lines.push(`${fieldName(template, 'url')} = "${mcp.url}"`);
    }

    const transformedEnv = transformEnv(mcp.env, template.entryFormat?.envTransform ?? 'bare');
    if (Object.keys(transformedEnv).length > 0) {
      const envPairs = Object.entries(transformedEnv)
        .map(([k, v]) => `${k} = ${v}`)
        .join(', ');
      lines.push(`${fieldName(template, 'env')} = { ${envPairs} }`);
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

  serialize(config: Record<string, unknown>, _template?: AgentTemplate): string {
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
