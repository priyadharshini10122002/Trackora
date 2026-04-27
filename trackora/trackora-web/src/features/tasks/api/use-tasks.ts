import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { Task, PaginatedResponse } from '@/shared/types/api';
import { taskKeys } from './keys';

export type TaskFilters = {
  status?: string;
  priority?: string;
  assigned_to?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
};

function stripEmpty(filters: TaskFilters): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== '',
    ),
  );
}

export function useTasks(filters: TaskFilters) {
  const cleanFilters = stripEmpty(filters);

  return useQuery({
    queryKey: taskKeys.list(cleanFilters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Task>>(ep.tasks.list, {
        params: cleanFilters,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
