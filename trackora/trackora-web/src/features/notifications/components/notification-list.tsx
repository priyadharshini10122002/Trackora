import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import type { Notification } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/date';
import { Button, Card, CardContent, Skeleton } from '@/shared/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import { Pagination } from '@/shared/components/pagination';
import { useNotifications } from '../api/use-notifications';
import { useMarkRead } from '../api/use-mark-read';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_created':
      return CheckCircle;
    case 'status_changed':
      return RefreshCw;
    case 'comment_added':
      return MessageSquare;
    case 'assignment':
      return UserPlus;
    default:
      return Bell;
  }
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const Icon = getNotificationIcon(notification.notification_type);

  function handleClick() {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
  }

  return (
    <Card
      className={cn(
        'cursor-pointer border-border/50 transition-all duration-200 hover:shadow-[var(--shadow-card)] hover:border-border',
        !notification.is_read &&
          'border-l-2 border-l-primary bg-primary/[0.03]',
      )}
      onClick={handleClick}
    >
      <CardContent className="flex gap-3 p-4">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
            !notification.is_read
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm',
              !notification.is_read ? 'font-semibold' : 'font-normal',
            )}
          >
            {notification.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {notification.message}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {formatRelative(notification.created_at)}
            </span>
            {notification.task && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                asChild
              >
                <Link to={`/tasks/${notification.task}`}>View Task</Link>
              </Button>
            )}
          </div>
        </div>
        {!notification.is_read && (
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary animate-pulse" />
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationList() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const filters: Record<string, unknown> = { page };
  if (tab === 'unread') {
    filters.is_read = false;
  }

  const { data, isLoading } = useNotifications(filters);
  const markRead = useMarkRead();

  function handleTabChange(value: string) {
    setTab(value as 'all' | 'unread');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="stagger-children space-y-3">
            {isLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="border-border/50">
                    <NotificationSkeleton />
                  </Card>
                ))}
              </>
            ) : (data?.results?.length ?? 0) > 0 ? (
              data!.results.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                />
              ))
            ) : (
              <EmptyState
                title="No notifications"
                description={
                  tab === 'unread'
                    ? "You're all caught up!"
                    : "You don't have any notifications yet."
                }
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {data && data.count > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(data.count / 10)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
