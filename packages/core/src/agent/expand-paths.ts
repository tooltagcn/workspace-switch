import path from 'node:path';
import os from 'node:os';
import type { AgentTemplate } from './template-types.js';

export interface ExpandedPaths {
  userRoot: string;
  projectRoot: string | null;
}

export function expandAgentPaths(
  template: AgentTemplate,
  userHome: string,
  projectRoot?: string,
): ExpandedPaths {
  const dirName = template.configDirName;
  return {
    userRoot: path.join(userHome, dirName),
    projectRoot: projectRoot ? path.join(projectRoot, dirName) : null,
  };
}

export function resolveCandidateDirNames(template: AgentTemplate): string[] {
  if (template.candidateDirNames && template.candidateDirNames.length > 0) {
    return template.candidateDirNames;
  }
  return [template.configDirName];
}

export function expandCustomPath(raw: string): string {
  let expanded = raw;
  if (expanded.startsWith('~/') || expanded === '~') {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir();
    expanded = path.join(home, expanded.slice(2));
  }
  expanded = expanded.replace(/\$\{(\w+)\}/g, (_match, varName) => process.env[varName] ?? '');
  expanded = expanded.replace(/\$(\w+)/g, (_match, varName) => process.env[varName] ?? '');
  return path.resolve(expanded);
}

export function resolveMcpConfigPath(
  agent: { mcpConfigPath: string | null; userRoot: string | null },
  template: AgentTemplate,
): string {
  if (agent.mcpConfigPath) {
    return expandCustomPath(agent.mcpConfigPath);
  }
  const root = agent.userRoot ?? '';
  return path.join(root, template.mcpFile ?? '');
}
