import type { McpRenderer } from '../types.js';
import type { WsMcpSchema } from '../schema.js';
import type { AgentTemplate } from '../../agent/template-types.js';

function transformEnvValue(value: string): string {
  const envMatch = value.match(/^env:(.+)$/);
  if (!envMatch) return value;
  const varName = envMatch[1];
  return `\${env:${varName}}`;
}

function transformEnv(env: Record<string, string> | undefined): Record<string, string> {
  if (!env) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transformEnvValue(value);
  }
  return result;
}

function indent(level: number): string {
  return '  '.repeat(level);
}

function toYamlValue(value: unknown, level: number): string {
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.includes('{') || value.includes('}')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map((v) => `${indent(level)}- ${toYamlValue(v, level + 1)}`).join('\n');
  }
  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value).length === 0) return '{}';
    return '\n' + Object.entries(value)
      .map(([k, v]) => `${indent(level)}${k}: ${toYamlValue(v, level + 1)}`)
      .join('\n');
  }
  return String(value);
}

export const yamlRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
    const entry: Record<string, unknown> = {};

    if (mcp.transport === 'stdio') {
      if (mcp.command) entry.command = mcp.command;
      if (mcp.args && mcp.args.length > 0) entry.args = mcp.args;
    } else {
      if (mcp.url) entry.url = mcp.url;
    }

    const transformedEnv = transformEnv(mcp.env);
    if (Object.keys(transformedEnv).length > 0) {
      entry.env = transformedEnv;
    }

    const field = template.mcpField ?? 'mcpServers';
    const lines: string[] = [];
    lines.push(`${field}:`);
    lines.push(`${indent(1)}${mcp.name}:`);

    for (const [key, value] of Object.entries(entry)) {
      lines.push(`${indent(2)}${key}: ${toYamlValue(value, 3)}`);
    }

    return lines.join('\n') + '\n';
  },

  parse(content: string, field: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');
    let currentField: string | null = null;
    let currentName: string | null = null;
    let currentEntry: Record<string, unknown> | null = null;
    let currentKey: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const fieldMatch = line.match(/^(\w+):\s*$/);
      if (fieldMatch) {
        if (currentField === field && currentName && currentEntry) {
          result[currentName] = currentEntry;
        }
        currentField = fieldMatch[1];
        currentName = null;
        currentEntry = null;
        currentKey = null;
        continue;
      }

      if (currentField === field) {
        const nameMatch = line.match(/^\s{2}(\w+):\s*$/);
        if (nameMatch) {
          if (currentName && currentEntry) {
            result[currentName] = currentEntry;
          }
          currentName = nameMatch[1];
          currentEntry = {};
          currentKey = null;
          continue;
        }

        if (currentEntry) {
          const kvMatch = line.match(/^\s{4}(\w+):\s*(.+)$/);
          if (kvMatch) {
            const [, key, value] = kvMatch;
            currentKey = key;
            if (value === '[]') {
              currentEntry[key] = [];
            } else if (value === '{}') {
              currentEntry[key] = {};
            } else {
              currentEntry[key] = value.replace(/^"(.*)"$/, '$1');
            }
            continue;
          }

          const arrayItemMatch = line.match(/^\s{4}-\s+(.+)$/);
          if (arrayItemMatch && currentKey) {
            const arr = currentEntry[currentKey];
            if (Array.isArray(arr)) {
              arr.push(arrayItemMatch[1].replace(/^"(.*)"$/, '$1'));
            } else {
              currentEntry[currentKey] = [arrayItemMatch[1].replace(/^"(.*)"$/, '$1')];
            }
            continue;
          }

          const nestedKvMatch = line.match(/^\s{6}(\w+):\s*(.+)$/);
          if (nestedKvMatch && currentKey) {
            const [, nestedKey, nestedValue] = nestedKvMatch;
            const obj = currentEntry[currentKey];
            if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
              (obj as Record<string, string>)[nestedKey] = nestedValue.replace(/^"(.*)"$/, '$1');
            } else {
              currentEntry[currentKey] = { [nestedKey]: nestedValue.replace(/^"(.*)"$/, '$1') };
            }
          }
        }
      }
    }

    if (currentField === field && currentName && currentEntry) {
      result[currentName] = currentEntry;
    }

    return result;
  },

  serialize(config: Record<string, unknown>, _template?: AgentTemplate): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
          if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
            lines.push(`  ${name}:`);
            for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
              if (k === 'env' && typeof v === 'object' && v !== null) {
                lines.push(`    env:`);
                for (const [ek, ev] of Object.entries(v as Record<string, string>)) {
                  const resolved = typeof ev === 'string' && ev.startsWith('env:')
                    ? `\${env:${ev.slice(4)}}`
                    : ev;
                  lines.push(`      ${ek}: ${resolved}`);
                }
              } else if (Array.isArray(v)) {
                lines.push(`    ${k}:`);
                for (const item of v) {
                  lines.push(`      - ${item}`);
                }
              } else {
                lines.push(`    ${k}: ${v}`);
              }
            }
          }
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    return lines.join('\n') + '\n';
  },
};
