import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { TaskHistory } from '@/shared/types/api';
import { taskKeys } from './keys';

export function useTaskHistory(id: string) {
  return useQuery({
    queryKey: taskKeys.history(id),
    queryFn: async () => {
      const { data } = await api.get<TaskHistory[]>(ep.tasks.history(id));
      return data;
    },
    enabled: !!id,
  });
}
