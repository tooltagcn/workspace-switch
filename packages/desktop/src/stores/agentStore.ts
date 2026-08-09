import { create } from 'zustand';
import { api } from '../lib/ipc.js';

export interface Agent {
  id: string;
  name: string;
  builtin: boolean;
  configDirName: string;
  userRoot: string | null;
  projectRoot: string | null;
  projectEnabled: boolean;
  mcpFile: string | null;
  mcpField: string | null;
  skillDir: string | null;
  enabled: boolean;
  detectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentStore {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  fetchAllAgents: () => Promise<void>;
  createAgent: (data: unknown) => Promise<Agent>;
  updateAgent: (id: string, data: unknown) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  loading: false,
  error: null,
  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await api.listAgents();
      set({ agents, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  fetchAllAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await api.listAllAgents();
      set({ agents, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  createAgent: async (data) => {
    const agent = await api.createAgent(data);
    set({ agents: [...get().agents, agent] });
    return agent;
  },
  updateAgent: async (id, data) => {
    const agent = await api.updateAgent(id, data);
    set({ agents: get().agents.map((a) => (a.id === id ? agent : a)) });
    return agent;
  },
  deleteAgent: async (id) => {
    await api.deleteAgent(id);
    set({ agents: get().agents.filter((a) => a.id !== id) });
  },
}));
