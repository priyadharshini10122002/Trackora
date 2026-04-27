import type { Task } from '@/shared/types/api';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarFallback,
  Progress,
  Skeleton,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatRelative, formatDate } from '@/shared/lib/date';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';

type TaskTableProps = {
  tasks: Task[];
  isLoading?: boolean;
  onRowClick?: (task: Task) => void;
};

function SlaIndicator({
  slaHours,
  elapsedHours,
  isBreached,
}: {
  slaHours: number;
  elapsedHours: number;
  isBreached: boolean;
}) {
  const percentage = Math.min(
    Math.round((elapsedHours / slaHours) * 100),
    100,
  );

  return (
    <div className="flex items-center gap-2">
      <Progress
        value={percentage}
        className={cn('h-2 w-16', isBreached && '[&>div]:bg-red-500')}
      />
      <span
        className={cn('text-xs tabular-nums', isBreached && 'text-red-600 font-medium')}
      >
        {elapsedHours}h / {slaHours}h
      </span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-8 w-8 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-2 w-24" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function TaskTable({ tasks, isLoading, onRowClick }: TaskTableProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px]">Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="hidden md:table-cell">Assigned To</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="hidden md:table-cell">SLA</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : tasks.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-32 text-center text-muted-foreground"
              >
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow
                key={task.id}
                className={cn(
                  'transition-colors hover:bg-muted/50',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(task)}
              >
                <TableCell className="max-w-[280px]">
                  <span className="font-medium text-foreground truncate block">
                    {task.title}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {task.assigned_to ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {task.assigned_to.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[120px]">
                        {task.assigned_to}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {task.due_date ? (
                    <span
                      className={cn(
                        'text-sm',
                        task.is_overdue && 'text-red-600 font-medium',
                      )}
                    >
                      {formatDate(task.due_date)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No due date
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {task.sla_hours != null ? (
                    <SlaIndicator
                      slaHours={task.sla_hours}
                      elapsedHours={task.elapsed_hours}
                      isBreached={task.is_sla_breached}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatRelative(task.created_at)}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
