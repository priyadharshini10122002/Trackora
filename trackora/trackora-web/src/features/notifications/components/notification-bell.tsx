import { useNavigate } from 'react-router-dom';
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
import { Button } from '@/shared/ui';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/shared/ui';
import { ScrollArea } from '@/shared/ui';
import { useUnreadCount } from '../api/use-notifications';
import { useNotifications } from '../api/use-notifications';
import { useMarkRead, useMarkAllRead } from '../api/use-mark-read';

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

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications } = useNotifications({ page: 1, page_size: 10 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.task) {
      navigate(`/tasks/${notification.task}`);
    }
  }

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative transition-all duration-200 hover:shadow-[var(--shadow-glow)]"
        >
          <Bell className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-scale-in">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              <span className="relative">{displayCount}</span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 border-border/50 shadow-[var(--shadow-card)]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-primary hover:text-primary"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="max-h-80">
          {(notifications?.results?.length ?? 0) > 0 ? (
            notifications!.results.map((notification) => {
              const Icon = getNotificationIcon(notification.notification_type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg p-3 transition-all duration-150',
                    !notification.is_read
                      ? 'bg-primary/5 hover:bg-primary/10'
                      : 'hover:bg-muted/50',
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      !notification.is_read
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        !notification.is_read && 'font-semibold',
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelative(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                  )}
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" />
              No notifications
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer justify-center text-sm font-medium text-primary transition-colors duration-150"
          onClick={() => navigate('/notifications')}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
