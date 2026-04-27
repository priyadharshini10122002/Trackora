import type { TaskStatus, Priority } from '@/shared/types/api';
import type { Action } from '@/shared/auth/permissions';

export const VALID_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT'],
  APPROVED: ['IN_PROGRESS', 'DRAFT'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
} as const;

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

const TRANSITION_ACTION_MAP: Record<string, Action> = {
  'DRAFT->PENDING_APPROVAL': 'task:submit',
  'PENDING_APPROVAL->APPROVED': 'task:approve',
  'PENDING_APPROVAL->DRAFT': 'task:reject',
  'APPROVED->IN_PROGRESS': 'task:start',
  'IN_PROGRESS->COMPLETED': 'task:complete',
  'COMPLETED->CLOSED': 'task:close',
} as const;

export function statusToAction(
  from: TaskStatus,
  to: TaskStatus,
): Action | null {
  return TRANSITION_ACTION_MAP[`${from}->${to}`] ?? null;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-700',
} as const;

export function getStatusColor(status: TaskStatus): string {
  return STATUS_COLORS[status];
}

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'text-blue-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-orange-500',
  CRITICAL: 'text-red-500',
} as const;

export function getPriorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority];
}
