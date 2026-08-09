import type { McpRenderer } from '../types.js';
import type { WsMcpSchema } from '../schema.js';
import type { AgentTemplate } from '../../agent/template-types.js';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

export const xmlRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<${template.mcpField ?? 'mcpServers'}>`);
    lines.push(`  <${mcp.name}>`);

    if (mcp.transport === 'stdio') {
      if (mcp.command) {
        lines.push(`    <command>${escapeXml(mcp.command)}</command>`);
      }
      if (mcp.args && mcp.args.length > 0) {
        lines.push('    <args>');
        for (const arg of mcp.args) {
          lines.push(`      <arg>${escapeXml(arg)}</arg>`);
        }
        lines.push('    </args>');
      }
    } else {
      if (mcp.url) {
        lines.push(`    <url>${escapeXml(mcp.url)}</url>`);
      }
    }

    const transformedEnv = transformEnv(mcp.env);
    if (Object.keys(transformedEnv).length > 0) {
      lines.push('    <env>');
      for (const [key, value] of Object.entries(transformedEnv)) {
        lines.push(`      <${key}>${escapeXml(value)}</${key}>`);
      }
      lines.push('    </env>');
    }

    lines.push(`  </${mcp.name}>`);
    lines.push(`</${template.mcpField ?? 'mcpServers'}>`);

    return lines.join('\n') + '\n';
  },

  parse(content: string, field: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const nameRegex = new RegExp(`<${field}>\\s*<([^>]+)>([\\s\\S]*?)<\\/\\1>\\s*<\\/${field}>`, 'g');
    let nameMatch;

    while ((nameMatch = nameRegex.exec(content)) !== null) {
      const name = nameMatch[1];
      const entryContent = nameMatch[2];
      const entry: Record<string, unknown> = {};

      const commandMatch = entryContent.match(/<command>([^<]*)<\/command>/);
      if (commandMatch) {
        entry.command = commandMatch[1];
      }

      const urlMatch = entryContent.match(/<url>([^<]*)<\/url>/);
      if (urlMatch) {
        entry.url = urlMatch[1];
      }

      const argsMatch = entryContent.match(/<args>([\s\S]*?)<\/args>/);
      if (argsMatch) {
        const args: string[] = [];
        const argRegex = /<arg>([^<]*)<\/arg>/g;
        let argMatch;
        while ((argMatch = argRegex.exec(argsMatch[1])) !== null) {
          args.push(argMatch[1]);
        }
        entry.args = args;
      }

      const envMatch = entryContent.match(/<env>([\s\S]*?)<\/env>/);
      if (envMatch) {
        const env: Record<string, string> = {};
        const envVarRegex = /<([^>]+)>([^<]*)<\/\1>/g;
        let envVarMatch;
        while ((envVarMatch = envVarRegex.exec(envMatch[1])) !== null) {
          env[envVarMatch[1]] = envVarMatch[2];
        }
        entry.env = env;
      }

      result[name] = entry;
    }

    return result;
  },

  serialize(config: Record<string, unknown>): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    for (const [field, section] of Object.entries(config)) {
      if (typeof section === 'object' && section !== null && !Array.isArray(section)) {
        lines.push(`<${field}>`);
        for (const [name, entry] of Object.entries(section as Record<string, unknown>)) {
          if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
            lines.push(`  <${name}>`);
            for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
              if (k === 'env' && typeof v === 'object' && v !== null) {
                lines.push('    <env>');
                for (const [ek, ev] of Object.entries(v as Record<string, string>)) {
                  const resolved = typeof ev === 'string' && ev.startsWith('env:')
                    ? `\${env:${ev.slice(4)}}`
                    : ev;
                  lines.push(`      <${ek}>${escapeXml(resolved)}</${ek}>`);
                }
                lines.push('    </env>');
              } else if (Array.isArray(v)) {
                lines.push(`    <${k}>`);
                for (const item of v) {
                  lines.push(`      <arg>${escapeXml(String(item))}</arg>`);
                }
                lines.push(`    </${k}>`);
              } else {
                lines.push(`    <${k}>${escapeXml(String(v))}</${k}>`);
              }
            }
            lines.push(`  </${name}>`);
          }
        }
        lines.push(`</${field}>`);
      }
    }

    return lines.join('\n') + '\n';
  },
};
