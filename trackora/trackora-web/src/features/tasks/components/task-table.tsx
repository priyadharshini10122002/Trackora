import type { Task, Priority } from '@/shared/types/api';
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

type TaskTableProps = {
  tasks: Task[];
  isLoading?: boolean;
  onRowClick?: (task: Task) => void;
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-red-500',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
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
        className={cn('h-1.5 w-16', isBreached && '[&>div]:bg-red-500')}
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

function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          PRIORITY_DOT[priority] ?? 'bg-gray-400',
        )}
      />
      <span className="text-xs text-muted-foreground">
        {PRIORITY_LABEL[priority] ?? priority}
      </span>
    </div>
  );
}

export function TaskTable({ tasks, isLoading, onRowClick }: TaskTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="w-[280px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Priority
            </TableHead>
            <TableHead className="hidden md:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned To
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Due Date
            </TableHead>
            <TableHead className="hidden md:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              SLA
            </TableHead>
            <TableHead className="hidden md:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Created
            </TableHead>
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
                  'group transition-all duration-150 hover:bg-accent/40 hover:shadow-sm border-l-2 border-l-transparent hover:border-l-primary/60',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(task)}
              >
                <TableCell className="max-w-[280px]">
                  <span className="font-medium text-foreground truncate block group-hover:text-primary transition-colors">
                    {task.title}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <PriorityDot priority={task.priority} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {task.assigned_to_name ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                          {task.assigned_to_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[120px]">
                        {task.assigned_to_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
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
                    <span className="text-xs text-muted-foreground">
                      No due date
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {task.sla_hours != null ? (
                    <SlaIndicator
                      slaHours={task.sla_hours}
                      elapsedHours={task.elapsed_hours ?? 0}
                      isBreached={task.is_sla_breached ?? false}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
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
