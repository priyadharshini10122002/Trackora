import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';
import type { Task } from '@/shared/types/api';
import type { TaskUpdateInput } from '../schemas/task-form';
import { taskKeys } from './keys';

export function useUpdateTask(id: string) {
  return useMutation({
    mutationFn: async (data: TaskUpdateInput) => {
      const { data: task } = await api.patch<Task>(ep.tasks.detail(id), data);
      return task;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id));

      queryClient.setQueryData<Task>(taskKeys.detail(id), (old) =>
        old ? { ...old, ...newData } : old,
      );

      return { previousTask };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
      toast.success('Task updated successfully');
    },
  });
}
