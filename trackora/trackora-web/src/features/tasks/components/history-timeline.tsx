import { ArrowRight } from 'lucide-react';
import type { TaskHistory } from '@/shared/types/api';
import { Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/date';
import { StatusBadge } from './status-badge';

type HistoryTimelineProps = {
  history: TaskHistory[];
  isLoading?: boolean;
};

export function HistoryTimeline({ history, isLoading }: HistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="relative space-y-8 border-l-2 border-muted pl-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No history available
      </p>
    );
  }

  // Newest first
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="relative space-y-8 border-l-2 border-muted pl-6">
      {sorted.map((entry) => (
        <div key={entry.id} className="relative">
          {/* Dot on the timeline */}
          <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />

          <div className="space-y-1.5">
            {/* Transition badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {entry.old_status ? (
                <>
                  <StatusBadge status={entry.old_status} />
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <StatusBadge status={entry.new_status} />
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    Created as
                  </span>
                  <StatusBadge status={entry.new_status} />
                </>
              )}
            </div>

            {/* Changed by */}
            <p className="text-sm font-medium">{entry.changed_by_name}</p>

            {/* Relative time */}
            <p className="text-xs text-muted-foreground">
              {formatRelative(entry.timestamp)}
            </p>

            {/* Reason */}
            {entry.reason && (
              <div className="mt-1.5 rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm italic text-muted-foreground">
                  {entry.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
