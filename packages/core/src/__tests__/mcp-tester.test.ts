import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { resolveEnvSecrets, testMcpConnection } from '../mcp/tester.js';
import type { McpServer, SecretStore } from '../mcp/types.js';

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

describe('testMcpConnection headers', () => {
  function makeHttpMcp(url: string): McpServer {
    return {
      id: 'gh',
      name: 'github',
      transport: 'http',
      command: null,
      url,
      args: [],
      env: {},
      headers: { Authorization: 'env:GITHUB_TOKEN' },
      description: null,
      tags: [],
      testStatus: 'untested',
      testError: null,
      testedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  it('sends resolved header secrets on the http request', async () => {
    let received: http.IncomingHttpHeaders | null = null;
    const server = http.createServer((req, res) => {
      received = req.headers;
      res.statusCode = 401;
      res.end('unauthorized');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const store = fakeSecretStore({ GITHUB_TOKEN: 'Bearer ghp_real' });
      const report = await testMcpConnection(makeHttpMcp(`http://127.0.0.1:${port}/mcp`), {
        secretStore: store,
        timeout: 5000,
      });

      expect(report.result.status).toBe('failed');
      expect(received).not.toBeNull();
      expect(received!.authorization).toBe('Bearer ghp_real');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
