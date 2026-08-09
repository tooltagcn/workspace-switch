import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentTemplate } from './template-types.js';

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

export function loadTemplates(): AgentTemplate[] {
  if (cachedTemplates) return cachedTemplates;

  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  const templatesDir = path.join(thisDir, 'templates');

  cachedTemplates = TEMPLATE_FILES.map((file) => {
    const raw = readFileSync(path.join(templatesDir, file), 'utf-8');
    return JSON.parse(raw) as AgentTemplate;
  });

  return cachedTemplates;
}

export function getTemplate(id: string): AgentTemplate | undefined {
  return loadTemplates().find((t) => t.id === id);
}
