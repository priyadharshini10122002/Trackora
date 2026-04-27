import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { Task, PaginatedResponse } from '@/shared/types/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import { formatRelative } from '@/shared/lib/date';
import { getPriorityConfig } from '@/shared/config/constants';
import { dashboardKeys } from '../api/keys';

export function MyActiveWork() {
  const { data, isLoading } = useQuery({
    queryKey: dashboardKeys.myWork(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Task>>(ep.tasks.list, {
        params: { status: 'IN_PROGRESS', assigned_to: 'me', page_size: 5 },
      });
      return data;
    },
  });

  const tasks = data?.results ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          My Active Work
        </CardTitle>
        <Link
          to="/tasks?status=IN_PROGRESS&assigned_to=me"
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
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No active tasks"
            description="You don't have any tasks in progress."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => {
              const priority = getPriorityConfig(task.priority);
              return (
                <li key={task.id}>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatRelative(task.updated_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priority?.color ?? 'text-muted-foreground'}`}
                    >
                      {priority?.label ?? task.priority}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
