import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
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
          t.sla_hours != null &&
          t.sla_hours > 0 &&
          (t.elapsed_hours ?? 0) / t.sla_hours > 0.8 &&
          !t.is_sla_breached,
      )
      .sort(
        (a, b) =>
          (b.elapsed_hours ?? 0) / (b.sla_hours ?? 1) -
          (a.elapsed_hours ?? 0) / (a.sla_hours ?? 1),
      )
      .slice(0, 5);
  }, [data]);

  return (
    <Card className="glass-subtle overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <CardTitle className="text-sm font-semibold tracking-tight">
          SLA Risk
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
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
          <ul className="space-y-3">
            {atRiskTasks.map((task) => {
              const pct = Math.round(
                ((task.elapsed_hours ?? 0) / (task.sla_hours ?? 1)) * 100,
              );
              const isCritical = pct > 95;
              const priority = getPriorityConfig(task.priority);

              return (
                <li key={task.id}>
                  <Link
                    to={`/tasks/${task.id}`}
                    className={cn(
                      'group block rounded-xl border px-4 py-3 transition-all duration-200 hover:shadow-md',
                      isCritical
                        ? 'border-red-200 bg-red-50/50 hover:border-red-300 dark:border-red-900/40 dark:bg-red-950/20'
                        : 'border-amber-200 bg-amber-50/30 hover:border-amber-300 dark:border-amber-900/30 dark:bg-amber-950/10',
                      isCritical && 'animate-pulse-glow',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            priority?.color ?? 'text-muted-foreground',
                          )}
                        >
                          {priority?.label ?? task.priority}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                            isCritical
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                          isCritical
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : 'bg-gradient-to-r from-amber-400 to-orange-500',
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {task.elapsed_hours ?? 0}h / {task.sla_hours}h SLA
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
