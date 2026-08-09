import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_DIRS = ['skills', 'mcp', 'providers'] as const;

export type WorkspaceSubDir = (typeof WORKSPACE_DIRS)[number];

export interface InitWorkspaceResult {
  dataDir: string;
  created: string[];
  existing: string[];
}

export function initWorkspace(dataDir: string): InitWorkspaceResult {
  const resolved = path.resolve(dataDir);
  const created: string[] = [];
  const existing: string[] = [];

  fs.mkdirSync(resolved, { recursive: true });

  for (const sub of WORKSPACE_DIRS) {
    const dir = path.join(resolved, sub);
    if (fs.existsSync(dir)) {
      existing.push(dir);
    } else {
      fs.mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
  }

  return { dataDir: resolved, created, existing };
}
