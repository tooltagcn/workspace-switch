import { create } from 'zustand';
import { api } from '../lib/ipc.js';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string | null;
  apiKeyRef: string | null;
  defaultModel: string | null;
  models: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProviderStore {
  providers: Provider[];
  loading: boolean;
  error: string | null;
  fetchProviders: () => Promise<void>;
  createProvider: (data: { name: string; baseUrl?: string; defaultModel?: string; models?: string[] }) => Promise<void>;
  updateProvider: (id: string, data: { name?: string; baseUrl?: string; defaultModel?: string; models?: string[] }) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  setApiKey: (providerName: string, apiKey: string) => Promise<void>;
  getApiKey: (providerName: string) => Promise<string | null>;
  isKeytarSupported: () => Promise<boolean>;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  loading: false,
  error: null,
  fetchProviders: async () => {
    set({ loading: true, error: null });
    try {
      const providers = await api.listProviders();
      set({ providers, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  createProvider: async (data) => {
    try {
      await api.createProvider(data);
      await get().fetchProviders();
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },
  updateProvider: async (id, data) => {
    try {
      await api.updateProvider(id, data);
      await get().fetchProviders();
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },
  deleteProvider: async (id) => {
    try {
      await api.deleteProvider(id);
      await get().fetchProviders();
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },
  setApiKey: async (providerName, apiKey) => {
    await api.setProviderApiKey(providerName, apiKey);
  },
  getApiKey: async (providerName) => {
    return api.getProviderApiKey(providerName);
  },
  isKeytarSupported: async () => {
    return api.isKeytarSupported();
  },
}));
