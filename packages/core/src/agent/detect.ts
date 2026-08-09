import type Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { listAgents, updateAgent } from './registry.js';
import { loadTemplates } from './template-loader.js';
import { resolveCandidateDirNames } from './expand-paths.js';

export interface DetectionResult {
  agentId: string;
  detected: boolean;
  detectedDir: string | null;
}

export function detectAgents(db: Database.Database): DetectionResult[] {
  const agents = listAgents(db).filter((a) => a.builtin);
  const templates = loadTemplates();
  const results: DetectionResult[] = [];

  for (const agent of agents) {
    const template = templates.find((t) => t.id === agent.id);
    if (!template) {
      results.push({ agentId: agent.id, detected: false, detectedDir: null });
      continue;
    }

    const candidates = resolveCandidateDirNames(template);
    const userHome = agent.userRoot
      ? path.dirname(agent.userRoot)
      : process.env.HOME ?? '';

    let detectedDir: string | null = null;
    for (const dirName of candidates) {
      const candidatePath = path.join(userHome, dirName);
      if (existsSync(candidatePath)) {
        detectedDir = candidatePath;
        break;
      }
    }

    if (detectedDir) {
      updateAgent(db, agent.id, {
        detectedAt: new Date().toISOString(),
        userRoot: detectedDir,
      });
    }

    results.push({
      agentId: agent.id,
      detected: detectedDir !== null,
      detectedDir,
    });
  }

  return results;
}
