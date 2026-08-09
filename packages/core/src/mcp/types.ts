export type McpTransport = 'stdio' | 'sse' | 'http';

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
  createdAt: string;
  updatedAt: string;
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
