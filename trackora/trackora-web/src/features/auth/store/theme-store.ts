import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/shared/types/domain';

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'trackora-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

/** Resolve `system` to the actual value */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useThemeStore((s) => s.theme);
  if (theme !== 'system') return theme;
  return getSystemTheme();
}

// Listen for OS-level changes when theme is `system`
if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const { theme } = useThemeStore.getState();
      if (theme === 'system') applyTheme('system');
    });
}
