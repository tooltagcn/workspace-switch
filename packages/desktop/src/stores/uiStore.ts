import { create } from 'zustand';
import { api } from '../lib/ipc.js';

type Theme = 'light' | 'dark' | 'system';

interface UiStore {
  sidebarOpen: boolean;
  theme: Theme;
  workspacePath: string;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setWorkspacePath: (path: string) => void;
  loadSettings: () => Promise<void>;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  workspacePath: '',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => {
    set({ theme });
    api.setSetting('theme', theme).catch(() => {});
  },
  setWorkspacePath: (path) => {
    set({ workspacePath: path });
    api.setSetting('workspacePath', path).catch(() => {});
  },
  loadSettings: async () => {
    try {
      const [theme, workspacePath] = await Promise.all([
        api.getSetting('theme'),
        api.getSetting('workspacePath'),
      ]);
      set({
        theme: (theme as Theme) || 'light',
        workspacePath: workspacePath || '',
      });
    } catch {
      // ignore — fall back to defaults
    }
  },
}));
