import { create } from 'zustand';
import { api } from '../lib/ipc.js';

export interface McpServer {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'http' | null;
  command: string | null;
  url: string | null;
  args: string[];
  env: Record<string, string>;
  description: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface McpStore {
  mcps: McpServer[];
  loading: boolean;
  error: string | null;
  fetchMcps: () => Promise<void>;
  createMcp: (data: unknown) => Promise<McpServer>;
  updateMcp: (id: string, data: unknown) => Promise<McpServer>;
  deleteMcp: (id: string) => Promise<void>;
  checkConsistency: () => Promise<any>;
  fixConsistency: () => Promise<any>;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  mcps: [],
  loading: false,
  error: null,
  fetchMcps: async () => {
    set({ loading: true, error: null });
    try {
      const mcps = await api.listMcps();
      set({ mcps, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  createMcp: async (data) => {
    const mcp = await api.createMcp(data);
    set({ mcps: [...get().mcps, mcp] });
    return mcp;
  },
  updateMcp: async (id, data) => {
    const mcp = await api.updateMcp(id, data);
    set({ mcps: get().mcps.map((m) => (m.id === id ? mcp : m)) });
    return mcp;
  },
  deleteMcp: async (id) => {
    await api.deleteMcp(id);
    set({ mcps: get().mcps.filter((m) => m.id !== id) });
  },
  checkConsistency: async () => {
    return api.checkMcpConsistency();
  },
  fixConsistency: async () => {
    const result = await api.fixMcpConsistency();
    await get().fetchMcps();
    return result;
  },
}));
