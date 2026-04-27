import type { TaskStatus, Priority } from '@/shared/types/api';
import { env } from '@/shared/lib/env';

export const APP_NAME = env.VITE_APP_NAME;

export const PRIORITIES: readonly {
  readonly value: Priority;
  readonly label: string;
  readonly color: string;
}[] = [
  { value: 'LOW', label: 'Low', color: 'text-blue-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-500' },
  { value: 'HIGH', label: 'High', color: 'text-orange-500' },
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-500' },
];

export const TASK_STATUSES: readonly {
  readonly value: TaskStatus;
  readonly label: string;
  readonly color: string;
}[] = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  {
    value: 'PENDING_APPROVAL',
    label: 'Pending Approval',
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    value: 'APPROVED',
    label: 'Approved',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
  },
  { value: 'CLOSED', label: 'Closed', color: 'bg-slate-100 text-slate-700' },
];

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export function getStatusConfig(status: TaskStatus) {
  return TASK_STATUSES.find((s) => s.value === status);
}

export function getPriorityConfig(priority: Priority) {
  return PRIORITIES.find((p) => p.value === priority);
}
