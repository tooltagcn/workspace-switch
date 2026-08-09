import type Database from 'better-sqlite3';
import { loadTemplates } from './template-loader.js';
import { expandAgentPaths } from './expand-paths.js';
import { createAgent, getAgent, updateAgent } from './registry.js';

export function initBuiltinAgents(db: Database.Database, userHome: string): void {
  const templates = loadTemplates();

  for (const template of templates) {
    const existing = getAgent(db, template.id);
    if (existing) {
      const updates: Record<string, unknown> = {};
      if (template.skillDir && !existing.skillDir) {
        updates.skillDir = template.skillDir;
      }
      if (!existing.templateId) {
        updates.templateId = template.id;
      }
      const tplFormat = template.targetFormat ?? template.entryFormat?.format ?? null;
      if (tplFormat && !existing.targetFormat) {
        updates.targetFormat = tplFormat;
      }
      if (template.entryFormat?.envTransform && !existing.envTransform) {
        updates.envTransform = template.entryFormat.envTransform;
      }
      if (template.entryFormat?.fieldMapping && !existing.fieldMapping) {
        updates.fieldMapping = template.entryFormat.fieldMapping;
      }
      if (Object.keys(updates).length > 0) {
        updateAgent(db, template.id, updates);
      }
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
