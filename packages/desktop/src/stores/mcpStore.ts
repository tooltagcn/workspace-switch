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
  testStatus: 'untested' | 'passed' | 'failed' | 'config_changed';
  testError: string | null;
  testedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applied?: {
    agents: string[];
    outOfSync: boolean;
  } | null;
}

export interface BatchTestProgress {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  currentMcpName: string;
}

interface McpStore {
  mcps: McpServer[];
  loading: boolean;
  error: string | null;
  testingMcpIds: Set<string>;
  batchTesting: boolean;
  batchProgress: BatchTestProgress | null;
  fetchMcps: () => Promise<void>;
  createMcp: (data: unknown) => Promise<McpServer>;
  updateMcp: (id: string, data: unknown) => Promise<McpServer>;
  deleteMcp: (id: string) => Promise<void>;
  addTag: (mcpId: string, tag: string) => Promise<void>;
  removeTag: (mcpId: string, tag: string) => Promise<void>;
  testMcp: (mcpId: string) => Promise<void>;
  startBatchTest: () => Promise<void>;
  checkConsistency: () => Promise<any>;
  fixConsistency: () => Promise<any>;
  applyMcp: (mcpId: string, agentId: string) => Promise<any>;
  unapplyMcp: (mcpId: string, agentId: string) => Promise<any>;
  syncMcp: (mcpId: string) => Promise<any>;
  isKeychainAvailable: () => Promise<boolean>;
  storeSecret: (mcpName: string, varName: string, value: string) => Promise<any>;
  deleteSecret: (mcpName: string, varName: string) => Promise<any>;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  mcps: [],
  loading: false,
  error: null,
  testingMcpIds: new Set(),
  batchTesting: false,
  batchProgress: null,
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
  addTag: async (mcpId, tag) => {
    await api.addMcpTag(mcpId, tag);
    const mcp = await api.getMcp(mcpId);
    set({ mcps: get().mcps.map((m) => (m.id === mcpId ? mcp : m)) });
  },
  removeTag: async (mcpId, tag) => {
    await api.removeMcpTag(mcpId, tag);
    const mcp = await api.getMcp(mcpId);
    set({ mcps: get().mcps.map((m) => (m.id === mcpId ? mcp : m)) });
  },
  testMcp: async (mcpId) => {
    const testing = get().testingMcpIds;
    if (testing.has(mcpId)) return;
    const next = new Set(testing);
    next.add(mcpId);
    set({ testingMcpIds: next });
    try {
      await api.testMcp(mcpId);
      await get().fetchMcps();
    } finally {
      const after = new Set(get().testingMcpIds);
      after.delete(mcpId);
      set({ testingMcpIds: after });
    }
  },
  startBatchTest: async () => {
    if (get().batchTesting) return;
    set({ batchTesting: true, batchProgress: null });

    api.removeBatchTestListeners();

    api.onBatchTestProgress((progress: BatchTestProgress) => {
      set({ batchProgress: progress });
    });

    api.onBatchTestResult((result: { mcpId: string; status: string; error?: string }) => {
      set({
        mcps: get().mcps.map((m) =>
          m.id === result.mcpId
            ? { ...m, testStatus: result.status as McpServer['testStatus'], testError: result.error ?? null, testedAt: new Date().toISOString() }
            : m,
        ),
      });
    });

    try {
      await api.batchTestMcps();
      await get().fetchMcps();
    } finally {
      api.removeBatchTestListeners();
      set({ batchTesting: false });
    }
  },
  checkConsistency: async () => {
    return api.checkMcpConsistency();
  },
  fixConsistency: async () => {
    const result = await api.fixMcpConsistency();
    await get().fetchMcps();
    return result;
  },
  applyMcp: async (mcpId, agentId) => {
    const result = await api.applyMcp(mcpId, agentId);
    await get().fetchMcps();
    return result;
  },
  unapplyMcp: async (mcpId, agentId) => {
    const result = await api.unapplyMcp(mcpId, agentId);
    await get().fetchMcps();
    return result;
  },
  syncMcp: async (mcpId) => {
    const result = await api.syncMcp(mcpId);
    await get().fetchMcps();
    return result;
  },
  isKeychainAvailable: async () => {
    return api.isKeychainAvailable();
  },
  storeSecret: async (mcpName, varName, value) => {
    return api.storeSecret(mcpName, varName, value);
  },
  deleteSecret: async (mcpName, varName) => {
    return api.deleteSecret(mcpName, varName);
  },
}));
