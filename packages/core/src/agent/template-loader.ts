import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentTemplate, EntryFormat, TargetFormat } from './template-types.js';

const TEMPLATE_FILES = [
  'claude-code.json',
  'codex.json',
  'cursor.json',
  'copilot.json',
  'qoder-cn.json',
  'opencode.json',
  'openclaude.json',
  'hermes.json',
  'qwen-code.json',
  'gemini-cli.json',
  'qoder.json',
  'factory.json',
  'droid.json',
  'aider.json',
];

let cachedTemplates: AgentTemplate[] | null = null;

function defaultEntryFormat(format: TargetFormat): EntryFormat {
  return {
    format,
    envTransform: format === 'toml-table' ? 'bare' : '${env:VAR}',
    fieldMapping: { command: 'command', args: 'args', url: 'url', env: 'env' },
  };
}

function resolveEntryFormat(template: AgentTemplate): EntryFormat | undefined {
  if (template.entryFormat) return template.entryFormat;
  const format = template.targetFormat ?? detectFormatFromMcpFile(template.mcpFile);
  if (!format) return undefined;
  return defaultEntryFormat(format);
}

function detectFormatFromMcpFile(mcpFile: string | null): TargetFormat | null {
  if (!mcpFile) return null;
  if (mcpFile.endsWith('.json')) return 'json-map';
  if (mcpFile.endsWith('.toml')) return 'toml-table';
  if (mcpFile.endsWith('.yaml') || mcpFile.endsWith('.yml')) return 'yaml';
  return null;
}

export function loadTemplates(): AgentTemplate[] {
  if (cachedTemplates) return cachedTemplates;

  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  const templatesDir = path.join(thisDir, 'templates');

  cachedTemplates = TEMPLATE_FILES.map((file) => {
    const raw = readFileSync(path.join(templatesDir, file), 'utf-8');
    const template = JSON.parse(raw) as AgentTemplate;
    const resolved = resolveEntryFormat(template);
    if (resolved && !template.entryFormat) {
      template.entryFormat = resolved;
    }
    return template;
  });

  return cachedTemplates;
}

export function getTemplate(id: string): AgentTemplate | undefined {
  return loadTemplates().find((t) => t.id === id);
}

export function resolveTemplateForAgent(agent: { templateId: string | null; configDirName: string }): AgentTemplate | null {
  const templates = loadTemplates();

  if (agent.templateId) {
    const byId = templates.find((t) => t.id === agent.templateId);
    if (byId) return byId;
  }

  const byDir = templates.find((t) => {
    if (t.configDirName === agent.configDirName) return true;
    if (t.candidateDirNames?.includes(agent.configDirName)) return true;
    return false;
  });

  return byDir ?? null;
}
