import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { tokenStore, refreshStore } from '@/shared/auth/token-store';
import { useAuthStore } from '@/features/auth/store';
import type { User } from '@/shared/types/api';

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  access: string;
  refresh: string;
  user: User & { roles: string[] };
};

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<LoginResponse>(ep.auth.login, payload);

      tokenStore.set(data.access);
      refreshStore.set(data.refresh);

      const user = data.user;
      const roles = user.roles ?? [];
      setSession(user, roles);
      return user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
