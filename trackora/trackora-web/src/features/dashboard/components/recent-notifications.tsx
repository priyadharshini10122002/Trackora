import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, BellOff } from 'lucide-react';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { Notification, PaginatedResponse } from '@/shared/types/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import { formatRelative } from '@/shared/lib/date';
import { dashboardKeys } from '../api/keys';

export function RecentNotifications() {
  const { data, isLoading } = useQuery({
    queryKey: dashboardKeys.notifications(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Notification>>(
        ep.notifications.list,
        { params: { is_read: false, page_size: 5 } },
      );
      return data;
    },
  });

  const notifications = data?.results ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Notifications
        </CardTitle>
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="No new notifications"
            description="You're all caught up."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.task ? `/tasks/${n.task}` : '/notifications'}
                  className="flex items-start gap-3 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
