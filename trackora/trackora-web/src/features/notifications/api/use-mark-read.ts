import { useMutation } from '@tanstack/react-query';
import type { PaginatedResponse, Notification } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';
import { toast } from 'sonner';
import { notificationKeys } from './keys';

export function useMarkRead() {
  return useMutation({
    mutationFn: (id: string) => api.post(ep.notifications.markRead(id)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      const previousLists = queryClient.getQueriesData<
        PaginatedResponse<Notification>
      >({ queryKey: notificationKeys.lists() });

      queryClient.setQueriesData<PaginatedResponse<Notification>>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            results: old.results.map((n) =>
              n.id === id ? { ...n, is_read: true } : n,
            ),
          };
        },
      );

      return { previousLists };
    },
    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });
}

export function useMarkAllRead() {
  return useMutation({
    mutationFn: () => api.post(ep.notifications.markAllRead),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
    },
  });
}
