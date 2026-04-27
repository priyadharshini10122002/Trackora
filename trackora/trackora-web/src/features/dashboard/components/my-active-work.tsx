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
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/components/empty-state';
import { formatRelative } from '@/shared/lib/date';
import { getPriorityConfig } from '@/shared/config/constants';
import { dashboardKeys } from '../api/keys';

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-red-500 animate-pulse',
};

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
    <Card className="card-hover glass-subtle overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
        <CardTitle className="text-sm font-semibold tracking-tight">
          My Active Work
        </CardTitle>
        <Link
          to="/tasks?status=IN_PROGRESS&assigned_to=me"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 flex-1" />
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
          <ul>
            {tasks.map((task) => {
              const priority = getPriorityConfig(task.priority);
              return (
                <li key={task.id}>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="group flex items-center justify-between gap-3 px-5 py-3 transition-all duration-200 hover:bg-accent/50 hover:translate-x-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={cn(
                          'inline-block h-2 w-2 shrink-0 rounded-full',
                          PRIORITY_DOT[task.priority] ?? 'bg-gray-400',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Updated {formatRelative(task.updated_at ?? task.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[11px] font-medium',
                        priority?.color ?? 'text-muted-foreground',
                      )}
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
