import type { Task, TaskStatus } from '@/shared/types/api';
import {
  Card,
  Badge,
  Avatar,
  AvatarFallback,
  Skeleton,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { TASK_STATUSES } from '@/shared/config/constants';

type KanbanBoardProps = {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-red-500 animate-pulse',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const COLUMN_TOP_BORDER: Record<TaskStatus, string> = {
  DRAFT: 'border-t-gray-400',
  PENDING_APPROVAL: 'border-t-amber-500',
  APPROVED: 'border-t-blue-500',
  IN_PROGRESS: 'border-t-indigo-500',
  COMPLETED: 'border-t-emerald-500',
  CLOSED: 'border-t-slate-400',
};

function KanbanCard({
  task,
  onClick,
  index,
}: {
  task: Task;
  onClick?: (task: Task) => void;
  index: number;
}) {
  return (
    <Card
      className={cn(
        'card-hover glass-subtle p-3 animate-fade-in-up',
        onClick && 'cursor-pointer',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onClick?.(task)}
    >
      <div className="space-y-2.5">
        <p className="font-medium text-sm leading-snug line-clamp-2">
          {task.title}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                PRIORITY_DOT_COLORS[task.priority] ?? 'bg-gray-400',
              )}
            />
            <span className="text-[10px] text-muted-foreground font-medium">
              {PRIORITY_LABELS[task.priority] ?? task.priority}
            </span>
          </div>

          {task.assigned_to_name ? (
            <Avatar className="h-6 w-6 transition-all hover:ring-2 hover:ring-primary/40 hover:ring-offset-1">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                {task.assigned_to_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>

        {task.sla_hours != null && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  task.is_sla_breached
                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                    : 'bg-gradient-to-r from-primary/80 to-primary',
                )}
                style={{
                  width: `${Math.min(Math.round(((task.elapsed_hours ?? 0) / task.sla_hours) * 100), 100)}%`,
                }}
              />
            </div>
            <span
              className={cn(
                'text-[10px] tabular-nums text-muted-foreground',
                task.is_sla_breached && 'text-red-600',
              )}
            >
              {task.elapsed_hours ?? 0}/{task.sla_hours}h
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="p-3 space-y-2 glass-subtle">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </Card>
  );
}

function KanbanColumn({
  status,
  label,
  tasks,
  isLoading,
  onTaskClick,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
}) {
  return (
    <div
      className={cn(
        'flex-shrink-0 w-[280px] flex flex-col rounded-xl bg-muted/20 border border-border/60 border-t-[3px] overflow-hidden',
        COLUMN_TOP_BORDER[status],
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        <Badge
          variant="secondary"
          className="text-[10px] tabular-nums px-1.5 py-0 rounded-full"
        >
          {isLoading ? '—' : tasks.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] p-2 space-y-2">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        ) : (
          tasks.map((task, i) => (
            <KanbanCard key={task.id} task={task} onClick={onTaskClick} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  isLoading,
  onTaskClick,
}: KanbanBoardProps) {
  const tasksByStatus = new Map<string, Task[]>();
  for (const s of TASK_STATUSES) {
    tasksByStatus.set(s.value, []);
  }
  for (const task of tasks) {
    const list = tasksByStatus.get(task.status);
    if (list) {
      list.push(task);
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 p-1 pb-4 min-w-max">
        {TASK_STATUSES.map((s) => (
          <KanbanColumn
            key={s.value}
            status={s.value}
            label={s.label}
            tasks={tasksByStatus.get(s.value) ?? []}
            isLoading={isLoading}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}
