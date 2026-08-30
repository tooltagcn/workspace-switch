import { create } from 'zustand';
import { api } from '../lib/ipc.js';

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  sourcePath: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillListFilter {
  tags?: string[];
  agentId?: string;
}

interface SkillStore {
  skills: Skill[];
  loading: boolean;
  error: string | null;
  filter: SkillListFilter;
  fetchSkills: (filter?: SkillListFilter) => Promise<void>;
  createSkill: (data: unknown) => Promise<Skill>;
  updateSkill: (id: string, data: unknown) => Promise<Skill>;
  deleteSkill: (id: string) => Promise<void>;
  addTag: (skillId: string, tag: string) => Promise<void>;
  removeTag: (skillId: string, tag: string) => Promise<void>;
  checkConsistency: () => Promise<any>;
  fixConsistency: () => Promise<any>;
  scanApplyStatus: () => Promise<any>;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: [],
  loading: false,
  error: null,
  filter: {},
  fetchSkills: async (filter) => {
    const active = filter ?? get().filter;
    set({ loading: true, error: null, filter: active });
    try {
      const skills = await api.listSkills(active);
      set({ skills, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  createSkill: async (data) => {
    const skill = await api.createSkill(data);
    set({ skills: [...get().skills, skill] });
    return skill;
  },
  updateSkill: async (id, data) => {
    const skill = await api.updateSkill(id, data);
    set({ skills: get().skills.map((s) => (s.id === id ? skill : s)) });
    return skill;
  },
  deleteSkill: async (id) => {
    await api.deleteSkill(id);
    set({ skills: get().skills.filter((s) => s.id !== id) });
  },
  addTag: async (skillId, tag) => {
    await api.addSkillTag(skillId, tag);
    const skill = await api.getSkill(skillId);
    set({ skills: get().skills.map((s) => (s.id === skillId ? skill : s)) });
  },
  removeTag: async (skillId, tag) => {
    await api.removeSkillTag(skillId, tag);
    const skill = await api.getSkill(skillId);
    set({ skills: get().skills.map((s) => (s.id === skillId ? skill : s)) });
  },
  checkConsistency: async () => {
    return api.checkSkillConsistency();
  },
  fixConsistency: async () => {
    const result = await api.fixSkillConsistency();
    await get().fetchSkills();
    return result;
  },
  scanApplyStatus: async () => {
    return api.scanSkillApplyStatus();
  },
}));
