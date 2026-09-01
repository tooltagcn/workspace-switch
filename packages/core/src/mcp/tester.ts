import type Database from 'better-sqlite3';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import type { McpServer, McpTestResult, McpTool, McpPrompt, TestMcpOptions, McpTestReport, BatchTestProgress, SecretStore } from './types.js';
import { getMcp, listMcps, saveTestResult, saveTools, savePrompts } from './manager.js';

const ENV_REF_PREFIX = 'env:';

/**
 * Resolves `env:VAR` references (Keychain-backed secrets) into real values.
 * Throws when a reference cannot be resolved, so the failure surfaces as a test error
 * instead of the child process silently receiving the literal `env:VAR` string.
 */
export async function resolveEnvSecrets(
  env: Record<string, string>,
  mcpName: string,
  secretStore?: SecretStore,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!value.startsWith(ENV_REF_PREFIX)) {
      resolved[key] = value;
      continue;
    }
    if (!secretStore) {
      throw new Error(`No secret store available to resolve environment variable "${key}"`);
    }
    const varName = value.slice(ENV_REF_PREFIX.length);
    const secret = await secretStore.getSecret(mcpName, varName);
    if (secret === null) {
      throw new Error(`Secret not found for environment variable "${key}" (MCP "${mcpName}")`);
    }
    resolved[key] = secret;
  }
  return resolved;
}

async function createTransport(mcp: McpServer, secretStore?: SecretStore) {
  switch (mcp.transport) {
    case 'sse':
      if (!mcp.url) throw new Error('SSE transport requires a URL');
      return new SSEClientTransport(new URL(mcp.url));
    case 'http':
      if (!mcp.url) throw new Error('HTTP transport requires a URL');
      return new StreamableHTTPClientTransport(new URL(mcp.url));
    case 'stdio':
    default: {
      if (!mcp.command) throw new Error('stdio transport requires a command');
      const env = await resolveEnvSecrets(mcp.env, mcp.name, secretStore);
      return new StdioClientTransport({
        command: mcp.command,
        args: mcp.args,
        env: { ...process.env as Record<string, string>, ...env },
      });
    }
  }
}

function isMethodNotFound(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (e.code === -32601 || e.code === '-32601') return true;
    if (typeof e.message === 'string' && /method not found/i.test(e.message)) return true;
  }
  return false;
}

export async function testMcpConnection(
  mcp: McpServer,
  options?: TestMcpOptions,
): Promise<McpTestReport> {
  const timeout = options?.timeout ?? 30000;
  const client = new Client({ name: 'workspace-switch-tester', version: '1.0.0' });

  const abortTimer = new AbortController();
  const timeoutId = setTimeout(() => abortTimer.abort(), timeout);

  try {
    const transport = await createTransport(mcp, options?.secretStore);

    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) => {
        abortTimer.signal.addEventListener('abort', () => {
          reject(new Error(`Connection timed out after ${timeout}ms`));
        });
      }),
    ]);

    let tools: McpTool[] = [];
    let prompts: McpPrompt[] = [];

    try {
      const toolsResult = await client.listTools();
      tools = toolsResult.tools.map((t) => ({
        id: randomUUID(),
        mcpId: mcp.id,
        name: t.name,
        description: t.description ?? null,
        inputSchema: t.inputSchema ? JSON.stringify(t.inputSchema) : null,
      }));
    } catch (err) {
      if (!isMethodNotFound(err)) throw err;
    }

    try {
      const promptsResult = await client.listPrompts();
      prompts = promptsResult.prompts.map((p) => ({
        id: randomUUID(),
        mcpId: mcp.id,
        name: p.name,
        description: p.description ?? null,
      }));
    } catch (err) {
      if (!isMethodNotFound(err)) throw err;
    }

    const result: McpTestResult = {
      mcpId: mcp.id,
      status: 'passed',
      errorMessage: null,
      toolsCount: tools.length,
      promptsCount: prompts.length,
      testedAt: new Date().toISOString(),
    };

    return { result, tools, prompts };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const result: McpTestResult = {
      mcpId: mcp.id,
      status: 'failed',
      errorMessage,
      toolsCount: 0,
      promptsCount: 0,
      testedAt: new Date().toISOString(),
    };
    return { result, tools: [], prompts: [] };
  } finally {
    clearTimeout(timeoutId);
    try { await client.close(); } catch { /* ignore */ }
  }
}

export async function runTestAndPersist(
  db: Database.Database,
  mcpId: string,
  options?: TestMcpOptions,
): Promise<McpTestReport> {
  const mcp = getMcp(db, mcpId);
  if (!mcp) throw new Error(`MCP server not found: ${mcpId}`);

  const report = await testMcpConnection(mcp, options);

  saveTestResult(db, report.result);
  if (report.result.status === 'passed') {
    saveTools(db, mcpId, report.tools);
    savePrompts(db, mcpId, report.prompts);
  }

  return report;
}

export async function batchTestMcps(
  db: Database.Database,
  options?: TestMcpOptions & {
    onProgress?: (progress: BatchTestProgress) => void;
    onResult?: (mcpId: string, mcpName: string, status: 'passed' | 'failed', error?: string) => void;
  },
): Promise<{ total: number; passed: number; failed: number }> {
  const mcps = listMcps(db);
  const total = mcps.length;
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const mcp = mcps[i];
    options?.onProgress?.({
      total,
      completed: i,
      passed,
      failed,
      currentMcpName: mcp.name,
    });

    const report = await runTestAndPersist(db, mcp.id, options);

    if (report.result.status === 'passed') {
      passed++;
    } else {
      failed++;
    }

    options?.onResult?.(mcp.id, mcp.name, report.result.status, report.result.errorMessage ?? undefined);
  }

  options?.onProgress?.({
    total,
    completed: total,
    passed,
    failed,
    currentMcpName: '',
  });

  return { total, passed, failed };
}

export async function callMcpTool(
  mcp: McpServer,
  toolName: string,
  args: Record<string, unknown>,
  options?: TestMcpOptions,
): Promise<{ content: Array<{ type: string; text?: string; [key: string]: unknown }>; isError?: boolean }> {
  const timeout = options?.timeout ?? 30000;
  const client = new Client({ name: 'workspace-switch-debugger', version: '1.0.0' });

  const abortTimer = new AbortController();
  const timeoutId = setTimeout(() => abortTimer.abort(), timeout);

  try {
    const transport = await createTransport(mcp, options?.secretStore);

    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) => {
        abortTimer.signal.addEventListener('abort', () => {
          reject(new Error(`Connection timed out after ${timeout}ms`));
        });
      }),
    ]);

    const result = await client.callTool({ name: toolName, arguments: args });
    return result as { content: Array<{ type: string; text?: string; [key: string]: unknown }>; isError?: boolean };
  } finally {
    clearTimeout(timeoutId);
    try { await client.close(); } catch { /* ignore */ }
  }
}
