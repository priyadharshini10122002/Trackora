import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';
import type { Task, TaskStatus } from '@/shared/types/api';
import { taskKeys } from '@/features/tasks';

export type WorkflowAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'start'
  | 'complete'
  | 'close';

export type WorkflowInput = {
  action: WorkflowAction;
  taskId: string;
  reason?: string;
  assigned_to?: string;
};

const actionEndpoint: Record<WorkflowAction, (id: string) => string> = {
  submit: ep.tasks.submit,
  approve: ep.tasks.approve,
  reject: ep.tasks.reject,
  assign: ep.tasks.assign,
  start: ep.tasks.start,
  complete: ep.tasks.complete,
  close: ep.tasks.close,
};

const actionToStatus: Record<WorkflowAction, TaskStatus> = {
  submit: 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'DRAFT',
  assign: 'APPROVED',
  start: 'IN_PROGRESS',
  complete: 'COMPLETED',
  close: 'CLOSED',
};

const actionLabel: Record<WorkflowAction, string> = {
  submit: 'Task submitted',
  approve: 'Task approved',
  reject: 'Task rejected',
  assign: 'Task assigned',
  start: 'Task started',
  complete: 'Task completed',
  close: 'Task closed',
};

export function useWorkflow() {
  return useMutation({
    mutationFn: async ({ action, taskId, reason, assigned_to }: WorkflowInput) => {
      const url = actionEndpoint[action](taskId);
      const body: Record<string, string> = {};
      if (reason) body.reason = reason;
      if (assigned_to) body.assigned_to = assigned_to;

      const { data } = await api.post<Task>(url, body);
      return data;
    },
    onMutate: async ({ action, taskId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(taskId));

      queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
        old ? { ...old, status: actionToStatus[action] } : old,
      );

      return { previousTask, taskId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          taskKeys.detail(context.taskId),
          context.previousTask,
        );
      }
    },
    onSettled: (_data, _error, { action, taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.history(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
      toast.success(actionLabel[action]);
    },
  });
}
