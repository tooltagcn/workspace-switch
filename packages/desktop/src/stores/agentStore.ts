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
  templateId: string | null;
  mcpConfigPath: string | null;
  targetFormat: string | null;
  envTransform: string | null;
  fieldMapping: Record<string, string> | null;
  detectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentStore {
  agents: Agent[];
  templates: any[];
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  fetchAllAgents: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  createAgent: (data: unknown) => Promise<Agent>;
  updateAgent: (id: string, data: unknown) => Promise<Agent>;
  updateTemplate: (id: string, templateId: string | null) => Promise<Agent>;
  updateMcpConfigPath: (id: string, mcpConfigPath: string | null) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  templates: [],
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
  fetchTemplates: async () => {
    try {
      const templates = await api.listTemplates();
      set({ templates });
    } catch (err) {
      console.error('Failed to fetch templates:', err);
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
  updateTemplate: async (id, templateId) => {
    const agent = await api.updateAgentTemplate(id, templateId);
    set({ agents: get().agents.map((a) => (a.id === id ? agent : a)) });
    return agent;
  },
  updateMcpConfigPath: async (id, mcpConfigPath) => {
    const agent = await api.updateAgentMcpConfigPath(id, mcpConfigPath);
    set({ agents: get().agents.map((a) => (a.id === id ? agent : a)) });
    return agent;
  },
  deleteAgent: async (id) => {
    await api.deleteAgent(id);
    set({ agents: get().agents.filter((a) => a.id !== id) });
  },
}));
