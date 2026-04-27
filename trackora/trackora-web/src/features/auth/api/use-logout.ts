import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { tokenStore, refreshStore } from '@/shared/auth/token-store';
import { useAuthStore } from '@/features/auth/store';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      const refresh = refreshStore.get();
      if (refresh) {
        await api.post(ep.auth.logout, { refresh_token: refresh });
      }
    },
    onSettled: () => {
      tokenStore.clear();
      refreshStore.clear();
      clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
