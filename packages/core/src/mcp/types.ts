export type McpTransport = 'stdio' | 'sse' | 'http';

export type McpTestStatus = 'untested' | 'passed' | 'failed' | 'config_changed';

export interface McpServer {
  id: string;
  name: string;
  transport: McpTransport | null;
  command: string | null;
  url: string | null;
  args: string[];
  env: Record<string, string>;
  description: string | null;
  tags: string[];
  testStatus: McpTestStatus;
  testError: string | null;
  testedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applied?: {
    agents: string[];
    outOfSync: boolean;
  } | null;
}

export interface CreateMcpInput {
  id?: string;
  name: string;
  transport?: McpTransport | null;
  command?: string | null;
  url?: string | null;
  args?: string[];
  env?: Record<string, string>;
  description?: string | null;
  tags?: string[];
}

export interface UpdateMcpInput {
  name?: string;
  transport?: McpTransport | null;
  command?: string | null;
  url?: string | null;
  args?: string[];
  env?: Record<string, string>;
  description?: string | null;
}

export interface McpListFilter {
  tags?: string[];
}

export interface McpTestResult {
  mcpId: string;
  status: 'passed' | 'failed';
  errorMessage: string | null;
  toolsCount: number;
  promptsCount: number;
  testedAt: string;
}

export interface McpTool {
  id: string;
  mcpId: string;
  name: string;
  description: string | null;
  inputSchema: string | null;
}

export interface McpPrompt {
  id: string;
  mcpId: string;
  name: string;
  description: string | null;
}

export interface TestMcpOptions {
  timeout?: number;
}

export interface McpTestReport {
  result: McpTestResult;
  tools: McpTool[];
  prompts: McpPrompt[];
}

export interface BatchTestProgress {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  currentMcpName: string;
}

export interface McpRenderer {
  render(mcp: import('./schema.js').WsMcpSchema, template: import('../agent/template-types.js').AgentTemplate): string;
  parse(content: string, field: string): Record<string, unknown>;
  serialize(config: Record<string, unknown>): string;
}

export interface SecretStore {
  storeSecret(mcpName: string, varName: string, value: string): Promise<void>;
  getSecret(mcpName: string, varName: string): Promise<string | null>;
  deleteSecret(mcpName: string, varName: string): Promise<void>;
  deleteAllSecretsForMcp(mcpName: string): Promise<void>;
}

export type McpOperation =
  | { type: 'add'; name: string; entry: Record<string, unknown> }
  | { type: 'remove'; name: string };

export interface ResolvedMcpConfig {
  filePath: string;
  mcpField: string;
  entryFormat: import('../agent/template-types.js').EntryFormat;
}
