import path from 'node:path';
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
