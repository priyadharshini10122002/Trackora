import type { Task } from '@/shared/types/api';
import {
  Card,
  Badge,
  Avatar,
  AvatarFallback,
  Skeleton,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { TASK_STATUSES } from '@/shared/config/constants';
import { PriorityBadge } from './priority-badge';

type KanbanBoardProps = {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

function KanbanCard({
  task,
  onClick,
}: {
  task: Task;
  onClick?: (task: Task) => void;
}) {
  return (
    <Card
      className={cn(
        'p-3 transition-shadow hover:shadow-md bg-card',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(task)}
    >
      <div className="space-y-2">
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
            <PriorityBadge
              priority={task.priority}
              className="text-[10px] px-1.5 py-0"
            />
          </div>

          {task.assigned_to ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {task.assigned_to.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>

        {task.sla_hours != null && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  task.is_sla_breached ? 'bg-red-500' : 'bg-primary',
                )}
                style={{
                  width: `${Math.min(Math.round((task.elapsed_hours / task.sla_hours) * 100), 100)}%`,
                }}
              />
            </div>
            <span
              className={cn(
                'text-[10px] tabular-nums text-muted-foreground',
                task.is_sla_breached && 'text-red-600',
              )}
            >
              {task.elapsed_hours}/{task.sla_hours}h
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="p-3 space-y-2">
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
  label,
  tasks,
  isLoading,
  onTaskClick,
}: {
  label: string;
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
}) {
  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col rounded-lg bg-muted/30 border">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <Badge
          variant="secondary"
          className="text-xs tabular-nums px-1.5 py-0"
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
          tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
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
