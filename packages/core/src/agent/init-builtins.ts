import type Database from 'better-sqlite3';
import path from 'node:path';
import { loadTemplates } from './template-loader.js';
import { expandAgentPaths } from './expand-paths.js';
import { createAgent, getAgent, updateAgent } from './registry.js';
import type { Agent } from './types.js';
import type { AgentTemplate } from './template-types.js';

export function initBuiltinAgents(db: Database.Database, userHome: string): void {
  const templates = loadTemplates();

  for (const template of templates) {
    const existing = getAgent(db, template.id);
    if (existing) {
      reconcileBuiltinAgent(db, existing, template, userHome);
      continue;
    }

    const paths = expandAgentPaths(template, userHome);

    createAgent(db, {
      id: template.id,
      name: template.name,
      builtin: true,
      configDirName: template.configDirName,
      userRoot: paths.userRoot,
      mcpFile: template.mcpFile,
      mcpField: template.mcpField,
      skillDir: template.skillDir,
      enabled: true,
      templateId: template.id,
      targetFormat: template.targetFormat ?? template.entryFormat?.format ?? null,
      envTransform: template.entryFormat?.envTransform ?? null,
      fieldMapping: template.entryFormat?.fieldMapping ?? null,
    });
  }
}

function reconcileBuiltinAgent(
  db: Database.Database,
  existing: Agent,
  template: AgentTemplate,
  userHome: string,
): void {
  if (!existing.builtin) return;

  const updates: Record<string, unknown> = {};
  const legacy = template.legacyDefaults;

  const shouldAdopt = (current: unknown, next: unknown, legacyValue: unknown): boolean => {
    if (current === next) return false;
    const empty = current === null || current === undefined || current === '';
    if (empty) return true;
    if (legacyValue !== undefined) return deepEqual(current, legacyValue);
    return false;
  };

  if (template.configDirName && shouldAdopt(existing.configDirName, template.configDirName, legacy?.configDirName)) {
    updates.configDirName = template.configDirName;
    const oldDefaultRoot = path.join(userHome, existing.configDirName);
    if (existing.userRoot === oldDefaultRoot) {
      updates.userRoot = path.join(userHome, template.configDirName);
    }
  }
  if (template.skillDir && shouldAdopt(existing.skillDir, template.skillDir, legacy?.skillDir)) {
    updates.skillDir = template.skillDir;
  }
  if (template.mcpFile && shouldAdopt(existing.mcpFile, template.mcpFile, legacy?.mcpFile)) {
    updates.mcpFile = template.mcpFile;
  }
  if (template.mcpField && shouldAdopt(existing.mcpField, template.mcpField, legacy?.mcpField)) {
    updates.mcpField = template.mcpField;
  }
  if (existing.templateId !== template.id) {
    updates.templateId = template.id;
  }

  const tplFormat = template.targetFormat ?? template.entryFormat?.format ?? null;
  if (tplFormat && shouldAdopt(existing.targetFormat, tplFormat, legacy?.targetFormat)) {
    updates.targetFormat = tplFormat;
  }
  const tplTransform = template.entryFormat?.envTransform;
  if (tplTransform && shouldAdopt(existing.envTransform, tplTransform, legacy?.envTransform)) {
    updates.envTransform = tplTransform;
  }
  const tplMapping = template.entryFormat?.fieldMapping;
  if (tplMapping && shouldAdopt(existing.fieldMapping, tplMapping, legacy?.fieldMapping)) {
    updates.fieldMapping = tplMapping;
  }

  if (Object.keys(updates).length > 0) {
    updateAgent(db, template.id, updates);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
