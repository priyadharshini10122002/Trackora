import { PageHeader } from '@/shared/components/page-header';
import { NotificationList } from '@/features/notifications';
import { useMarkAllRead, useUnreadCount } from '@/features/notifications';
import { Button } from '@/shared/ui';
import { CheckCheck } from 'lucide-react';

function NotificationsPage() {
  const markAllRead = useMarkAllRead();
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on task activity"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="transition-all duration-150 hover:shadow-[var(--shadow-glow)]"
            >
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <div className="stagger-children">
        <NotificationList />
      </div>
    </div>
  );
}

export default NotificationsPage;
