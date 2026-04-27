import { useQuery } from '@tanstack/react-query';
import type { Comment, PaginatedResponse } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { commentKeys } from './keys';

export function useComments(taskId: string) {
  return useQuery({
    queryKey: commentKeys.list(taskId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Comment>>(ep.comments, {
        params: { task: taskId },
      });
      return data;
    },
    enabled: !!taskId,
    staleTime: 30_000,
  });
}
