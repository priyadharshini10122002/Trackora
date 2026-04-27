import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { Task } from '@/shared/types/api';
import { taskKeys } from './keys';

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Task>(ep.tasks.detail(id));
      return data;
    },
    enabled: !!id,
  });
}
