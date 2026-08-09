import keytar from 'keytar';
import type Database from 'better-sqlite3';
import type { SecretStore } from './types.js';

const SERVICE_NAME = 'workspace-switch';

function accountKey(mcpName: string, varName: string): string {
  return `mcp/${mcpName}/${varName}`;
}

export class KeychainSecretStore implements SecretStore {
  async storeSecret(mcpName: string, varName: string, value: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, accountKey(mcpName, varName), value);
  }

  async getSecret(mcpName: string, varName: string): Promise<string | null> {
    const password = await keytar.getPassword(SERVICE_NAME, accountKey(mcpName, varName));
    return password;
  }

  async deleteSecret(mcpName: string, varName: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, accountKey(mcpName, varName));
  }

  async deleteAllSecretsForMcp(mcpName: string): Promise<void> {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    for (const cred of credentials) {
      if (cred.account.startsWith(`mcp/${mcpName}/`)) {
        await keytar.deletePassword(SERVICE_NAME, cred.account);
      }
    }
  }
}

export class PlaintextSecretStore implements SecretStore {
  constructor(private db: Database.Database) {}

  async storeSecret(mcpName: string, varName: string, value: string): Promise<void> {
    const key = accountKey(mcpName, varName);
    const existing = this.db
      .prepare('SELECT id FROM secret WHERE key = ?')
      .get(key) as { id: string } | undefined;

    if (existing) {
      this.db.prepare('UPDATE secret SET value = ?, updated_at = datetime(\'now\') WHERE key = ?').run(value, key);
    } else {
      this.db
        .prepare('INSERT INTO secret (id, key, value, created_at, updated_at) VALUES (random_uuid(), ?, ?, datetime(\'now\'), datetime(\'now\'))')
        .run(key, value);
    }
  }

  async getSecret(mcpName: string, varName: string): Promise<string | null> {
    const key = accountKey(mcpName, varName);
    const row = this.db.prepare('SELECT value FROM secret WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  async deleteSecret(mcpName: string, varName: string): Promise<void> {
    const key = accountKey(mcpName, varName);
    this.db.prepare('DELETE FROM secret WHERE key = ?').run(key);
  }

  async deleteAllSecretsForMcp(mcpName: string): Promise<void> {
    this.db.prepare('DELETE FROM secret WHERE key LIKE ?').run(`mcp/${mcpName}/%`);
  }
}

export async function isKeychainAvailable(): Promise<boolean> {
  try {
    await keytar.getPassword(SERVICE_NAME, 'test-availability-check');
    return true;
  } catch {
    return false;
  }
}

export function getWorkspaceConfig(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM workspace_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setWorkspaceConfig(db: Database.Database, key: string, value: string): void {
  const existing = db.prepare('SELECT key FROM workspace_config WHERE key = ?').get(key);
  if (existing) {
    db.prepare('UPDATE workspace_config SET value = ? WHERE key = ?').run(value, key);
  } else {
    db.prepare('INSERT INTO workspace_config (key, value) VALUES (?, ?)').run(key, value);
  }
}

export async function createSecretStore(
  db: Database.Database,
  promptUser?: (message: string) => Promise<boolean>,
): Promise<SecretStore> {
  const available = await isKeychainAvailable();
  if (available) {
    return new KeychainSecretStore();
  }

  const allowPlaintext = getWorkspaceConfig(db, 'allow_plaintext_secrets');
  if (allowPlaintext === 'true') {
    return new PlaintextSecretStore(db);
  }
  if (allowPlaintext === 'false') {
    throw new Error('Keychain unavailable and plaintext secrets are disabled');
  }

  if (promptUser) {
    const confirmed = await promptUser(
      'Keychain is unavailable. Allow storing secrets in plaintext in the database? (yes/no)',
    );
    setWorkspaceConfig(db, 'allow_plaintext_secrets', confirmed ? 'true' : 'false');
    if (confirmed) {
      return new PlaintextSecretStore(db);
    }
  }

  throw new Error('Keychain unavailable and no user preference set for plaintext fallback');
}
