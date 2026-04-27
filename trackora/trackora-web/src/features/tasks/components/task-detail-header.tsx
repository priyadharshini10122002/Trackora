import { Link } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Pencil } from 'lucide-react';
import type { Task, TaskStatus } from '@/shared/types/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';
import { useCan } from '@/shared/auth/permissions';
import type { Role } from '@/shared/auth/permissions';
import { useUser, useRoles } from '@/features/auth/store';
import { VALID_TRANSITIONS, statusToAction } from '../utils/transitions';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';

const TRANSITION_LABELS: Record<string, string> = {
  'DRAFT->PENDING_APPROVAL': 'Submit for Approval',
  'PENDING_APPROVAL->APPROVED': 'Approve',
  'PENDING_APPROVAL->DRAFT': 'Reject',
  'APPROVED->IN_PROGRESS': 'Start Work',
  'IN_PROGRESS->COMPLETED': 'Complete',
  'COMPLETED->CLOSED': 'Close',
};

type TaskDetailHeaderProps = {
  task: Task;
  onStatusChange?: (newStatus: TaskStatus) => void;
};

export function TaskDetailHeader({
  task,
  onStatusChange,
}: TaskDetailHeaderProps) {
  const user = useUser();
  const roles = useRoles();
  const can = useCan(roles as Role[], user?.id);

  const transitions = VALID_TRANSITIONS[task.status];

  const allowedTransitions = transitions.filter((target) => {
    const action = statusToAction(task.status, target);
    if (!action) return false;
    return can(action, {
      created_by: task.created_by,
      assigned_to: task.assigned_to,
    });
  });

  const hasActions = allowedTransitions.length > 0;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/tasks">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Tasks
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Title + badges */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Task actions</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            {allowedTransitions.map((target) => {
              const key = `${task.status}->${target}`;
              const label = TRANSITION_LABELS[key] ?? target;
              return (
                <DropdownMenuItem
                  key={target}
                  onClick={() => onStatusChange?.(target)}
                >
                  {label}
                </DropdownMenuItem>
              );
            })}

            {hasActions && <DropdownMenuSeparator />}

            <DropdownMenuItem asChild>
              <Link to={`/tasks/${task.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Task
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
