import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Provider, CreateProviderInput, UpdateProviderInput, ProviderListFilter } from './types.js';

interface ProviderRow {
  id: string;
  name: string;
  base_url: string | null;
  api_key_ref: string | null;
  default_model: string | null;
  models_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProvider(row: ProviderRow): Provider {
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

export function listProviders(db: Database.Database, filter?: ProviderListFilter): Provider[] {
  let rows: ProviderRow[];

  if (filter?.name) {
    rows = db
      .prepare('SELECT * FROM provider WHERE name LIKE ? ORDER BY name')
      .all(`%${filter.name}%`) as ProviderRow[];
  } else {
    rows = db.prepare('SELECT * FROM provider ORDER BY name').all() as ProviderRow[];
  }

  return rows.map(rowToProvider);
}

export function getProvider(db: Database.Database, id: string): Provider | null {
  const row = db.prepare('SELECT * FROM provider WHERE id = ?').get(id) as ProviderRow | undefined;
  return row ? rowToProvider(row) : null;
}

export function getProviderByName(db: Database.Database, name: string): Provider | null {
  const row = db.prepare('SELECT * FROM provider WHERE name = ?').get(name) as
    | ProviderRow
    | undefined;
  return row ? rowToProvider(row) : null;
}

export function createProvider(db: Database.Database, input: CreateProviderInput): Provider {
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();
  const modelsJson = input.models ? JSON.stringify(input.models) : null;

  db.prepare(
    `INSERT INTO provider (id, name, base_url, api_key_ref, default_model, models_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.baseUrl ?? null,
    null,
    input.defaultModel ?? null,
    modelsJson,
    now,
    now,
  );

  return getProvider(db, id)!;
}

export function updateProvider(
  db: Database.Database,
  id: string,
  input: UpdateProviderInput,
): Provider | null {
  const existing = getProvider(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.baseUrl !== undefined) {
    fields.push('base_url = ?');
    values.push(input.baseUrl);
  }
  if (input.defaultModel !== undefined) {
    fields.push('default_model = ?');
    values.push(input.defaultModel);
  }
  if (input.models !== undefined) {
    fields.push('models_json = ?');
    values.push(JSON.stringify(input.models));
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE provider SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getProvider(db, id)!;
}

export function deleteProvider(db: Database.Database, id: string): boolean {
  const provider = getProvider(db, id);
  if (!provider) return false;

  db.prepare('DELETE FROM provider WHERE id = ?').run(id);
  return true;
}

export function setApiKeyRef(db: Database.Database, providerId: string, ref: string): Provider {
  const now = new Date().toISOString();
  db.prepare('UPDATE provider SET api_key_ref = ?, updated_at = ? WHERE id = ?').run(
    ref,
    now,
    providerId,
  );
  return getProvider(db, providerId)!;
}
