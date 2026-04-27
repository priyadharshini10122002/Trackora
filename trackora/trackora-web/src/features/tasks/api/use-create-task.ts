import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';
import type { Task } from '@/shared/types/api';
import type { TaskCreateInput } from '../schemas/task-form';
import { taskKeys } from './keys';

export function useCreateTask() {
  return useMutation({
    mutationFn: async (data: TaskCreateInput) => {
      const { data: task } = await api.post<Task>(ep.tasks.list, data);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
      toast.success('Task created successfully');
    },
  });
}
