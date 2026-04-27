export type TaskStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  sla_hours?: number | null;
  elapsed_hours?: number;
  is_overdue?: boolean;
  is_sla_breached?: boolean;
  created_by?: string;
  created_by_name?: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_active: boolean;
  date_joined: string;
  roles?: string[];
}

export interface Comment {
  id: string;
  task: string;
  content: string;
  is_internal: boolean;
  author: string;
  author_name: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  task: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  task: string;
  file: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TaskStats {
  total: number;
  draft: number;
  pending_approval: number;
  approved: number;
  in_progress: number;
  completed: number;
  closed: number;
  overdue: number;
  sla_breached: number;
}

export interface TaskHistory {
  id: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus;
  changed_by: string;
  changed_by_name: string;
  reason: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorPayload {
  error: string;
  message: string;
  type: string;
  details?: Record<string, string[]>;
  correlation_id?: string;
}
