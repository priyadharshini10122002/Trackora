import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types/api';

type AuthState = {
  user: User | null;
  roles: string[];
  setSession: (user: User, roles: string[]) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      roles: [],
      setSession: (user, roles) => set({ user, roles }),
      clear: () => set({ user: null, roles: [] }),
    }),
    {
      name: 'trackora-auth',
      partialize: (state) => ({ user: state.user, roles: state.roles }),
    },
  ),
);

// ── Selector hooks ─────────────────────────────────────────────────
export function useUser() {
  return useAuthStore((s) => s.user);
}

export function useRoles() {
  return useAuthStore((s) => s.roles);
}

export function useIsAuthenticated() {
  return useAuthStore((s) => s.user !== null);
}
