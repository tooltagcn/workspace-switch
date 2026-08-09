import fs from 'node:fs';
import path from 'node:path';
import type { WsMcpSchema } from './schema.js';

export function saveMcpToWorkspace(workspaceDir: string, schema: WsMcpSchema): string {
  const mcpDir = path.join(workspaceDir, 'mcp');
  fs.mkdirSync(mcpDir, { recursive: true });

  const filePath = path.join(mcpDir, `${schema.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(schema, null, 2) + '\n', 'utf-8');
  return filePath;
}

export function loadMcpFromWorkspace(workspaceDir: string, name: string): WsMcpSchema | null {
  const filePath = path.join(workspaceDir, 'mcp', `${name}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as WsMcpSchema;
}

export function listMcpFromWorkspace(workspaceDir: string): WsMcpSchema[] {
  const mcpDir = path.join(workspaceDir, 'mcp');
  if (!fs.existsSync(mcpDir)) return [];

  const files = fs.readdirSync(mcpDir).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(mcpDir, file), 'utf-8');
    return JSON.parse(raw) as WsMcpSchema;
  });
}
