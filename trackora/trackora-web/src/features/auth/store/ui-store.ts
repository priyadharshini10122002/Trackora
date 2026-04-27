import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Density = 'comfortable' | 'compact';

type UiState = {
  sidebarCollapsed: boolean;
  density: Density;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDensity: (density: Density) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      density: 'comfortable',
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      setDensity: (density) => set({ density }),
    }),
    {
      name: 'trackora-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
      }),
    },
  ),
);
