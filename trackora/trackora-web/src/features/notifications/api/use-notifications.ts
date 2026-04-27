import { useQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Notification } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { notificationKeys } from './keys';

export function useNotifications(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: notificationKeys.list(params ?? {}),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Notification>>(
        ep.notifications.list,
        { params },
      );
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Notification>>(
        ep.notifications.list,
        { params: { is_read: false, page_size: 1 } },
      );
      return data.count;
    },
    refetchInterval: 30_000,
  });
}
