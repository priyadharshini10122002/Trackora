import type { TaskStatus } from '@/shared/types/api';
import { Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { TASK_STATUSES } from '@/shared/config/constants';

const STATUS_STYLES: Record<TaskStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
};

type StatusBadgeProps = {
  status: TaskStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = TASK_STATUSES.find((s) => s.value === status);
  const label = config?.label ?? status;

  return (
    <Badge
      className={cn(
        'border font-medium text-xs',
        STATUS_STYLES[status],
        className,
      )}
    >
      {label}
    </Badge>
  );
}
