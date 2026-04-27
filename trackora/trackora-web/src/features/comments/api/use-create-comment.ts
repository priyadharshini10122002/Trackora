import { useMutation } from '@tanstack/react-query';
import type { Comment, PaginatedResponse } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';
import { toast } from 'sonner';
import { commentKeys } from './keys';

interface CreateCommentInput {
  taskId: string;
  content: string;
  is_internal: boolean;
}

export function useCreateComment() {
  return useMutation({
    mutationFn: async ({ taskId, content, is_internal }: CreateCommentInput) => {
      const { data } = await api.post<Comment>(ep.comments, {
        task: taskId,
        content,
        is_internal,
      });
      return data;
    },
    onMutate: async ({ taskId, content, is_internal }) => {
      const queryKey = commentKeys.list(taskId);

      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<PaginatedResponse<Comment>>(queryKey);

      queryClient.setQueryData<PaginatedResponse<Comment>>(queryKey, (old) => {
        const optimisticComment: Comment = {
          id: `temp-${Date.now()}`,
          task: taskId,
          content,
          is_internal,
          author: '',
          author_name: 'You',
          created_at: new Date().toISOString(),
        };

        if (!old) {
          return { count: 1, next: null, previous: null, results: [optimisticComment] };
        }

        return {
          ...old,
          count: old.count + 1,
          results: [...old.results, optimisticComment],
        };
      });

      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Comment added');
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
  });
}
