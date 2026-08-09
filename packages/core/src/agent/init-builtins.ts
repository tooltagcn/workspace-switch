import type Database from 'better-sqlite3';
import { loadTemplates } from './template-loader.js';
import { expandAgentPaths } from './expand-paths.js';
import { createAgent, getAgent, updateAgent } from './registry.js';

export function initBuiltinAgents(db: Database.Database, userHome: string): void {
  const templates = loadTemplates();

  for (const template of templates) {
    const existing = getAgent(db, template.id);
    if (existing) {
      if (template.skillDir && !existing.skillDir) {
        updateAgent(db, template.id, { skillDir: template.skillDir });
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
    });
  }
}
