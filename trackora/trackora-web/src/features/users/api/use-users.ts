import { useQuery, keepPreviousData } from '@tanstack/react-query';

import type { PaginatedResponse, User } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';

import { userKeys } from './keys';

export function useUsers(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>(ep.users, {
        params,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
