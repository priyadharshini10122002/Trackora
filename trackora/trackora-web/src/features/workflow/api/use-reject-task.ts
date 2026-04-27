import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';
import type { Task } from '@/shared/types/api';
import { taskKeys } from '@/features/tasks';

type RejectInput = {
  reason: string;
};

export function useRejectTask(taskId: string) {
  return useMutation({
    mutationFn: async ({ reason }: RejectInput) => {
      const { data } = await api.post<Task>(ep.tasks.reject(taskId), { reason });
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(taskId));

      queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
        old ? { ...old, status: 'DRAFT' as const } : old,
      );

      return { previousTask };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(taskId), context.previousTask);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.history(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
      toast.success('Task rejected');
    },
  });
}
