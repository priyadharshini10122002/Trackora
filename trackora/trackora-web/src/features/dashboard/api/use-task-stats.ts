import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { TaskStats } from '@/shared/types/api';
import { dashboardKeys } from './keys';

export function useTaskStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<TaskStats>(ep.tasks.stats);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
