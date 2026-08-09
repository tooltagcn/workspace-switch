import type Database from 'better-sqlite3';
import type { Provider } from './types.js';
import { getProvider } from './manager.js';

export interface ApplyProviderResult {
  provider: Provider;
  agentId: string;
  appliedAt: string;
}

export function applyProviderToAgent(
  db: Database.Database,
  providerId: string,
  agentId: string,
): ApplyProviderResult {
  const provider = getProvider(db, providerId);
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const agent = db.prepare('SELECT id FROM agent WHERE id = ?').get(agentId) as
    | { id: string }
    | undefined;
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const now = new Date().toISOString();

  db.prepare("DELETE FROM resource_agent WHERE resource_type = 'provider' AND agent_id = ?").run(
    agentId,
  );

  db.prepare(
    `INSERT INTO resource_agent (resource_type, resource_id, agent_id, applied_at)
     VALUES ('provider', ?, ?, ?)`,
  ).run(providerId, agentId, now);

  return { provider, agentId, appliedAt: now };
}

export function getProviderForAgent(
  db: Database.Database,
  agentId: string,
): Provider | null {
  const row = db
    .prepare(
      `SELECT p.* FROM provider p
       JOIN resource_agent ra ON ra.resource_id = p.id
       WHERE ra.resource_type = 'provider' AND ra.agent_id = ?
       ORDER BY ra.applied_at DESC
       LIMIT 1`,
    )
    .get(agentId) as
    | {
        id: string;
        name: string;
        base_url: string | null;
        api_key_ref: string | null;
        default_model: string | null;
        models_json: string | null;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    apiKeyRef: row.api_key_ref,
    defaultModel: row.default_model,
    models: row.models_json ? JSON.parse(row.models_json) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
