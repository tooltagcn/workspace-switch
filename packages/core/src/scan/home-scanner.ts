import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { AgentTemplate } from '../agent/template-types.js';
import type { DiscoveredFolder, ScannedSkill, ScannedMcp } from './types.js';
import { scanSkillsFromAgents, scanMcpsFromAgents } from './agent-scanner.js';
import type { Agent } from '../agent/types.js';

export function scanHomeHiddenFolders(
  userHome: string,
  templates: AgentTemplate[],
): DiscoveredFolder[] {
  const results: DiscoveredFolder[] = [];

  if (!fs.existsSync(userHome)) return results;

  const entries = fs.readdirSync(userHome, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('.')) continue;

    const fullPath = path.join(userHome, entry.name);
    if (fs.lstatSync(fullPath).isSymbolicLink()) continue;

    const matchedTemplate = templates.find((t) => {
      const candidates = t.candidateDirNames ?? [t.configDirName];
      return candidates.includes(entry.name);
    });

    results.push({
      path: fullPath,
      dirName: entry.name,
      matchedAgentId: matchedTemplate?.id ?? null,
      matchedAgentName: matchedTemplate?.name ?? null,
    });
  }

  return results;
}

function foldersToSyntheticAgents(
  db: Database.Database,
  folders: DiscoveredFolder[],
  templates: AgentTemplate[],
): Agent[] {
  const agents: Agent[] = [];

  for (const folder of folders) {
    if (folder.matchedAgentId) {
      const template = templates.find((t) => t.id === folder.matchedAgentId);
      if (!template) continue;

      const existingRow = db
        .prepare('SELECT * FROM agent WHERE id = ?')
        .get(folder.matchedAgentId) as Record<string, unknown> | undefined;

      if (existingRow) {
        agents.push(rowToAgent(existingRow));
        continue;
      }

      agents.push({
        id: folder.matchedAgentId,
        name: folder.matchedAgentName ?? template.name,
        builtin: true,
        configDirName: template.configDirName,
        userRoot: folder.path,
        projectRoot: null,
        projectEnabled: false,
        mcpFile: template.mcpFile,
        mcpField: template.mcpField,
        skillDir: template.skillDir,
        enabled: true,
        detectedAt: null,
        templateId: null,
        mcpConfigPath: null,
        targetFormat: template.targetFormat ?? template.entryFormat?.format ?? null,
        envTransform: template.entryFormat?.envTransform ?? null,
        fieldMapping: template.entryFormat?.fieldMapping ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Handle unmatched folders - check if they have a skills/ subdirectory
      const skillsDir = path.join(folder.path, 'skills');
      if (fs.existsSync(skillsDir) && fs.lstatSync(skillsDir).isDirectory()) {
        agents.push({
          id: `unmatched:${folder.dirName}`,
          name: folder.dirName,
          builtin: false,
          configDirName: folder.dirName,
          userRoot: folder.path,
          projectRoot: null,
          projectEnabled: false,
          mcpFile: null,
          mcpField: null,
          skillDir: 'skills',
          enabled: true,
          detectedAt: null,
          templateId: null,
          mcpConfigPath: null,
          targetFormat: null,
          envTransform: null,
          fieldMapping: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return agents;
}

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    builtin: (row.builtin as number) === 1,
    configDirName: row.config_dir_name as string,
    userRoot: row.user_root as string | null,
    projectRoot: row.project_root as string | null,
    projectEnabled: (row.project_enabled as number) === 1,
    mcpFile: row.mcp_file as string | null,
    mcpField: row.mcp_field as string | null,
    skillDir: row.skill_dir as string | null,
    enabled: (row.enabled as number) === 1,
    detectedAt: row.detected_at as string | null,
    templateId: row.template_id as string | null,
    mcpConfigPath: row.mcp_config_path as string | null,
    targetFormat: row.target_format as string | null,
    envTransform: row.env_transform as string | null,
    fieldMapping: row.field_mapping_json ? JSON.parse(row.field_mapping_json as string) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function scanSkillsFromFolders(
  db: Database.Database,
  folders: DiscoveredFolder[],
  templates: AgentTemplate[],
): ScannedSkill[] {
  const agents = foldersToSyntheticAgents(db, folders, templates);
  return scanSkillsFromAgents(db, agents);
}

export function scanMcpsFromFolders(
  db: Database.Database,
  folders: DiscoveredFolder[],
  templates: AgentTemplate[],
): ScannedMcp[] {
  const agents = foldersToSyntheticAgents(db, folders, templates);
  return scanMcpsFromAgents(db, agents);
}
