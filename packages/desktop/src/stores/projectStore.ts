import { create } from 'zustand';
import { api } from '../lib/ipc.js';

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectAgentEnablement {
  agentId: string;
  agentName: string;
  configDirName: string;
  enabled: boolean;
}

interface ProjectWithAgents extends Project {
  agents: ProjectAgentEnablement[];
}

interface ProjectSkill {
  skillId: string;
  name: string;
  description: string | null;
  tags: string[];
  appliedAgents: string[];
  brokenAgents: string[];
}

interface ProjectStore {
  projects: Project[];
  selectedProject: ProjectWithAgents | null;
  projectSkills: ProjectSkill[];
  availableSkills: any[];
  loading: boolean;
  error: string | null;

  fetchProjects: (search?: string) => Promise<void>;
  selectProject: (id: string) => Promise<void>;
  clearSelection: () => void;
  createProject: (data: { path: string; name?: string }) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  toggleAgent: (projectId: string, agentId: string, enabled: boolean) => Promise<void>;
  fetchProjectSkills: (projectId: string) => Promise<void>;
  applySkill: (projectId: string, skillId: string, agentId: string) => Promise<void>;
  unapplySkill: (projectId: string, skillId: string, agentId: string) => Promise<void>;
  fetchAvailableSkills: (projectId: string, agentId?: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProject: null,
  projectSkills: [],
  availableSkills: [],
  loading: false,
  error: null,

  fetchProjects: async (search?: string) => {
    set({ loading: true, error: null });
    try {
      const projects = await api.projectList(search);
      set({ projects, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  selectProject: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const project = await api.projectGet(id);
      set({ selectedProject: project, loading: false });
      get().fetchProjectSkills(id);
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  clearSelection: () => {
    set({ selectedProject: null, projectSkills: [], availableSkills: [] });
  },

  createProject: async (data) => {
    const project = await api.projectCreate(data);
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  renameProject: async (id: string, name: string) => {
    const updated = await api.projectUpdate(id, { name });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
      selectedProject: state.selectedProject?.id === id ? { ...state.selectedProject, name: updated.name } : state.selectedProject,
    }));
  },

  deleteProject: async (id: string) => {
    await api.projectDelete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
    }));
  },

  toggleAgent: async (projectId: string, agentId: string, enabled: boolean) => {
    await api.projectToggleAgent(projectId, agentId, enabled);
    await get().selectProject(projectId);
  },

  fetchProjectSkills: async (projectId: string) => {
    try {
      const skills = await api.projectSkillList(projectId);
      set({ projectSkills: skills });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  applySkill: async (projectId: string, skillId: string, agentId: string) => {
    await api.projectApplySkill(projectId, skillId, agentId);
    await get().fetchProjectSkills(projectId);
  },

  unapplySkill: async (projectId: string, skillId: string, agentId: string) => {
    await api.projectUnapplySkill(projectId, skillId, agentId);
    await get().fetchProjectSkills(projectId);
  },

  fetchAvailableSkills: async (projectId: string, agentId?: string) => {
    try {
      const skills = await api.projectAvailableSkills(projectId, agentId);
      set({ availableSkills: skills });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
