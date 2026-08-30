import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AgentTemplateExport {
  id: string;
  name: string;
  configDirName: string;
  candidateDirNames?: string[];
  mcpFile: string | null;
  mcpField: string | null;
  skillDir: string | null;
  icon: string | null;
  targetFormat?: 'json-map' | 'toml-table' | null;
}

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
  'codebuddy.json',
  'kiro-cli.json',
];

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(thisDir, '..', '..', 'core', 'src', 'agent', 'templates');

export function getAllTemplates(): AgentTemplateExport[] {
  return TEMPLATE_FILES.map((file) => {
    const raw = readFileSync(path.join(templatesDir, file), 'utf-8');
    return JSON.parse(raw) as AgentTemplateExport;
  });
}

export function getTemplateById(id: string): AgentTemplateExport | undefined {
  return getAllTemplates().find((t) => t.id === id);
}

export const TEMPLATE_IDS = TEMPLATE_FILES.map((f) => f.replace('.json', ''));
