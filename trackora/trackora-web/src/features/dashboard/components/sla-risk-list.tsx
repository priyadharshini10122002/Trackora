import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { Task, PaginatedResponse } from '@/shared/types/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Progress,
  Skeleton,
} from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import { getPriorityConfig } from '@/shared/config/constants';
import { dashboardKeys } from '../api/keys';

export function SLARiskList() {
  const { data, isLoading } = useQuery({
    queryKey: dashboardKeys.slaRisk(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Task>>(ep.tasks.list, {
        params: { page_size: 100, status: 'IN_PROGRESS' },
      });
      return data;
    },
  });

  const atRiskTasks = useMemo(() => {
    if (!data?.results) return [];
    return data.results
      .filter(
        (t) =>
          t.sla_hours !== null &&
          t.sla_hours > 0 &&
          t.elapsed_hours / t.sla_hours > 0.8 &&
          !t.is_sla_breached,
      )
      .sort(
        (a, b) =>
          b.elapsed_hours / (b.sla_hours ?? 1) -
          a.elapsed_hours / (a.sla_hours ?? 1),
      )
      .slice(0, 5);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">SLA Risk</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : atRiskTasks.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No SLA risks"
            description="All tasks are within their SLA thresholds."
            className="py-8"
          />
        ) : (
          <ul className="space-y-4">
            {atRiskTasks.map((task) => {
              const pct = Math.round(
                (task.elapsed_hours / (task.sla_hours ?? 1)) * 100,
              );
              const tone = pct > 95 ? 'destructive' : 'warning';
              const priority = getPriorityConfig(task.priority);

              return (
                <li key={task.id}>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="block rounded-md -mx-2 px-2 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority?.color ?? 'text-muted-foreground'}`}
                        >
                          {priority?.label ?? task.priority}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <Progress value={pct} tone={tone} className="h-1.5" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.elapsed_hours}h / {task.sla_hours}h SLA
                    </p>
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
