import type { Priority } from '@/shared/types/api';
import { Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { PRIORITIES } from '@/shared/config/constants';

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
  MEDIUM: 'bg-blue-50 text-blue-600 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-600 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-600 border-red-200 animate-pulse',
};

type PriorityBadgeProps = {
  priority: Priority;
  className?: string;
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITIES.find((p) => p.value === priority);
  const label = config?.label ?? priority;

  return (
    <Badge
      className={cn(
        'border font-medium text-xs',
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {label}
    </Badge>
  );
}
