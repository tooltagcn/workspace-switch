import { describe, it, expect } from 'vitest';
import { resolveEnvSecrets } from '../mcp/tester.js';
import type { SecretStore } from '../mcp/types.js';

function fakeSecretStore(secrets: Record<string, string>): SecretStore {
  return {
    async storeSecret(_mcpName, varName, value) {
      secrets[varName] = value;
    },
    async getSecret(_mcpName, varName) {
      return secrets[varName] ?? null;
    },
    async deleteSecret(_mcpName, varName) {
      delete secrets[varName];
    },
    async deleteAllSecretsForMcp() {
      for (const key of Object.keys(secrets)) delete secrets[key];
    },
  };
}

describe('resolveEnvSecrets', () => {
  it('passes plain values through unchanged', async () => {
    const env = { LOG_LEVEL: 'debug', EMPTY: '' };
    await expect(resolveEnvSecrets(env, 'srv')).resolves.toEqual(env);
  });

  it('resolves env:VAR references from the secret store', async () => {
    const store = fakeSecretStore({ GITHUB_TOKEN: 'ghp_real' });
    const env = { GITHUB_TOKEN: 'env:GITHUB_TOKEN', LOG_LEVEL: 'debug' };
    await expect(resolveEnvSecrets(env, 'github', store)).resolves.toEqual({
      GITHUB_TOKEN: 'ghp_real',
      LOG_LEVEL: 'debug',
    });
  });

  it('throws when a reference cannot be resolved', async () => {
    const store = fakeSecretStore({});
    await expect(
      resolveEnvSecrets({ TOKEN: 'env:TOKEN' }, 'github', store),
    ).rejects.toThrow(/Secret not found for environment variable "TOKEN"/);
  });

  it('throws when a reference is present but no secret store is available', async () => {
    await expect(resolveEnvSecrets({ TOKEN: 'env:TOKEN' }, 'github')).rejects.toThrow(
      /No secret store available/,
    );
  });
});
