import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface UiStore {
  sidebarOpen: boolean;
  theme: Theme;
  workspacePath: string;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setWorkspacePath: (path: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  workspacePath: '',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setWorkspacePath: (path) => set({ workspacePath: path }),
}));
