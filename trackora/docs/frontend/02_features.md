# Trackora Frontend — Part 2: Feature Implementation

> Continues from `01_architecture.md`. This part walks through each feature module with concrete data flows, components, hooks, and interactions with the backend.

---

## Table of Contents (Part 2)

10. [Feature: Authentication](#10-feature-authentication)
11. [Feature: Dashboard](#11-feature-dashboard)
12. [Feature: Task List & Filters](#12-feature-task-list--filters)
13. [Feature: Task Detail & Workflow Actions](#13-feature-task-detail--workflow-actions)
14. [Feature: Kanban Board](#14-feature-kanban-board)
15. [Feature: Task Create / Edit Forms](#15-feature-task-create--edit-forms)
16. [Feature: Comments](#16-feature-comments)
17. [Feature: Attachments](#17-feature-attachments)
18. [Feature: Notifications (Realtime)](#18-feature-notifications-realtime)
19. [Feature: Admin — Users & Roles](#19-feature-admin--users--roles)
20. [Feature: Settings — Notification Preferences](#20-feature-settings--notification-preferences)
21. [Cross-Cutting: Forms & Validation](#21-cross-cutting-forms--validation)
22. [Cross-Cutting: Realtime Strategy](#22-cross-cutting-realtime-strategy)
23. [Cross-Cutting: Performance Engineering](#23-cross-cutting-performance-engineering)
24. [Cross-Cutting: Error Handling & Resilience](#24-cross-cutting-error-handling--resilience)

---

## 10. Feature: Authentication

### 10.1 Screens

| Route | Purpose |
|---|---|
| `/login` | Email + password. Forgot-password link. |
| `/register` | Self-service registration (if enabled by feature flag). |
| `/forgot-password` | Request reset email (roadmap — backend doesn't expose it yet). |

### 10.2 Login Flow

```
┌───────────────┐       ┌──────────────────┐        ┌─────────────┐
│  LoginForm    │──────▶│ useLoginMutation │───────▶│ POST /login │
└───────────────┘       └────────┬─────────┘        └──────┬──────┘
                                 │                         │
                                 │                  ┌──────▼──────┐
                                 │                  │ {access,    │
                                 │                  │  refresh}   │
                                 │                  └──────┬──────┘
                                 ▼                         │
                       ┌──────────────────┐                │
                       │ tokenStore.set() │◀───────────────┘
                       │ refreshStore.set │
                       └────────┬─────────┘
                                ▼
                       ┌──────────────────┐
                       │ GET /users/me    │ (fetch profile)
                       └────────┬─────────┘
                                ▼
                       ┌──────────────────┐
                       │ authStore.set... │
                       │ navigate(from ?? │
                       │          '/')    │
                       └──────────────────┘
```

### 10.3 Implementation

```tsx
// src/features/auth/api/use-login.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { tokenStore, refreshStore } from '@/shared/auth/token-store';
import { useAuthStore } from '../store';
import type { User } from '@/shared/types/api';

type LoginInput = { email: string; password: string };
type LoginResponse = { access: string; refresh: string };

export function useLogin() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<LoginResponse>(ep.auth.login, input);
      tokenStore.set(data.access);
      refreshStore.set(data.refresh);

      const { data: me } = await api.get<User & { roles: string[] }>('/users/me/');
      setSession(me, me.roles);
      return me;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
```

> **Note:** Trackora's backend may not expose `/users/me/` today. Add it as a lightweight endpoint, or synthesize the user object from the JWT's `user_id` claim + a `GET /users/{id}/` call. The JWT is decoded client-side (no signature check — just base64) purely to extract the subject ID. Never trust JWT claims for auth decisions.

### 10.4 LoginForm Component

```tsx
// src/features/auth/components/login-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogin } from '../api/use-login';
import { Button, Input, FormField } from '@/shared/ui';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type LoginInput = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(schema),
  });
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  return (
    <form
      onSubmit={handleSubmit((values) =>
        login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) })
      )}
      noValidate
    >
      <FormField label="Email" error={formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} />
      </FormField>
      <FormField label="Password" error={formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </FormField>
      <Button type="submit" loading={login.isPending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
```

### 10.5 Logout

```tsx
// src/features/auth/api/use-logout.ts
export function useLogout() {
  const qc = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      const refresh = refreshStore.get();
      if (refresh) await api.post(ep.auth.logout, { refresh });
    },
    onSettled: () => {
      tokenStore.clear();
      refreshStore.clear();
      clear();
      qc.clear();
      navigate('/login', { replace: true });
    },
  });
}
```

**`onSettled` not `onSuccess`:** even if the logout API fails, we clear local state. Users can always sign out locally.

### 10.6 Bootstrap on Page Load

When the app mounts, check for a refresh token in sessionStorage; if present, attempt silent refresh → fetch user profile → hydrate auth store. If it fails, redirect to login.

```tsx
// src/app/Providers.tsx
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    (async () => {
      try {
        const refresh = refreshStore.get();
        if (!refresh) return;
        await refreshQueue.refresh();
        const { data } = await api.get<User & { roles: string[] }>('/users/me/');
        setSession(data, data.roles);
      } catch {
        clear();
      } finally {
        setReady(true);
      }
    })();
  }, [setSession, clear]);

  if (!ready) return <FullscreenSpinner />;
  return <>{children}</>;
}
```

---

## 11. Feature: Dashboard

### 11.1 Purpose

Single landing page showing at-a-glance counts and action-needed lists per role.

### 11.2 Widgets

| Widget | Content | Data source |
|---|---|---|
| Stats cards | Total, Draft, Pending Approval, In Progress, Completed | `GET /tasks/stats/` |
| "Needs approval" list (MANAGER/ADMIN) | Tasks in PENDING_APPROVAL | `GET /tasks/?status=PENDING_APPROVAL` |
| "My active work" list | IN_PROGRESS assigned to me | `GET /tasks/?status=IN_PROGRESS&assigned_to=me` |
| "SLA risk" list | Tasks close to SLA breach | Filter on client: `is_sla_breached=false` + elapsed > 0.8 × sla |
| Recent notifications | Latest 5 unread | `GET /notifications/?is_read=false&page_size=5` |
| Activity feed (optional) | Recent history rows across visible tasks | Multi-query; paginated |

### 11.3 Layout

```
┌───────────────────────────────────────────────────────────┐
│  Stats: 8 cards in a responsive grid                      │
├────────────────────────────┬──────────────────────────────┤
│  Needs approval (role=M/A) │  Notifications               │
│  or My active work (C)     │  — list with unread badge    │
├────────────────────────────┴──────────────────────────────┤
│  SLA risk (full width)                                    │
└───────────────────────────────────────────────────────────┘
```

### 11.4 Role-Aware Rendering

```tsx
function DashboardPage() {
  const can = useCan();
  return (
    <>
      <StatsGrid />
      <div className="grid md:grid-cols-2 gap-6">
        {can('task:approve') ? <NeedsApprovalList /> : <MyActiveWorkList />}
        <RecentNotifications />
      </div>
      <SLARiskList />
    </>
  );
}
```

### 11.5 Stats Caching

Backend returns cached stats (5 min TTL). Query staleTime mirrors backend:

```ts
export function useTaskStats() {
  return useQuery({
    queryKey: taskKeys.stats(),
    queryFn: async () => (await api.get<TaskStats>(ep.tasks.stats)).data,
    staleTime: 5 * 60_000,
  });
}
```

---

## 12. Feature: Task List & Filters

### 12.1 UX Requirements

- Server-side filter, search, sort, paginate
- URL reflects filter state (shareable/bookmarkable)
- "Keep previous data" during pagination (no flash of loading)
- Density toggle: comfortable / compact
- Column show/hide (stored in Zustand `ui-prefs` store)
- View switcher: Table / Kanban / My Tasks tab
- Virtualized rows above 100 items

### 12.2 Filter URL Contract

```
/tasks?status=APPROVED&priority=HIGH&assigned_to=<uuid>&search=deploy&ordering=-created_at&page=2
```

### 12.3 TanStack Table Wiring

```tsx
// src/features/tasks/components/task-table.tsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import type { Task } from '@/shared/types/api';
import { columns } from './columns';

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="w-full">
      <thead>...</thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 12.4 Virtualization Above 100 Rows

```tsx
// Swap out <tbody> for Virtuoso when list > 100
import { TableVirtuoso } from 'react-virtuoso';
```

### 12.5 Filter Bar Implementation

```tsx
function FilterBar() {
  const [filters, setFilters] = useUrlState(filterSchema, { page: 1 });
  const debouncedSearch = useDebounce(filters.search, 300);

  return (
    <div className="flex gap-3 flex-wrap">
      <StatusSelect value={filters.status} onChange={(v) => setFilters({ status: v, page: 1 })} />
      <PrioritySelect value={filters.priority} onChange={(v) => setFilters({ priority: v, page: 1 })} />
      <SearchInput value={filters.search} onChange={(v) => setFilters({ search: v, page: 1 })} />
      <ClearFiltersButton onClick={() => setFilters({ status: undefined, priority: undefined, search: '', page: 1 })} />
    </div>
  );
}
```

### 12.6 Empty, Loading, Error States

Every list renders one of four states, never `null`:

```tsx
function TasksPage() {
  const [filters] = useUrlState(...);
  const { data, isLoading, isError, error } = useTasks(filters);

  if (isLoading) return <TaskTableSkeleton />;
  if (isError)   return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data.results.length) {
    return <EmptyState
      title="No tasks match your filters"
      description="Adjust filters or create a new task."
      action={<Button onClick={() => navigate('/tasks/new')}>New task</Button>}
    />;
  }
  return <TaskTable tasks={data.results} pagination={...} />;
}
```

---

## 13. Feature: Task Detail & Workflow Actions

### 13.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ◀ Back     Title (editable for creators)      [Actions Menu ▾]  │
│ Status: [IN_PROGRESS]  Priority: HIGH   Due: Dec 3   SLA: 24h   │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: Overview | Comments | Attachments | History              │
├─────────────────────────────────────────────────────────────────┤
│  <Tab content>                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Sidebar:                                                       │
│    - Created by (avatar + name)                                 │
│    - Assigned to (avatar + assign button)                       │
│    - SLA indicator (progress bar + remaining hours)             │
│    - Danger zone (delete for admin)                             │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Actions Menu — Conditional on Status + Role

| Status | Actions shown |
|---|---|
| DRAFT | Submit for approval · Edit · Delete (admin) |
| PENDING_APPROVAL | Approve · Reject · Edit (creator + before approval) |
| APPROVED | Assign · Start (if assignee) · Re-assign |
| IN_PROGRESS | Complete · Add comment · Upload attachment |
| COMPLETED | Close · Re-open (future) |
| CLOSED | (read-only) |

```tsx
function ActionMenu({ task }: { task: Task }) {
  const can = useCan();
  const items = useMemo(() => {
    const actions: MenuItem[] = [];
    if (task.status === 'DRAFT' && can('task:submit', task))
      actions.push({ label: 'Submit for approval', onClick: () => openSubmitDialog(task) });
    if (task.status === 'PENDING_APPROVAL' && can('task:approve', task)) {
      actions.push({ label: 'Approve', onClick: () => openApproveDialog(task) });
      actions.push({ label: 'Reject', onClick: () => openRejectDialog(task), destructive: true });
    }
    if (task.status === 'APPROVED' && can('task:assign', task))
      actions.push({ label: 'Assign', onClick: () => openAssignDialog(task) });
    if (task.status === 'APPROVED' && can('task:start', task))
      actions.push({ label: 'Start work', onClick: () => start.mutate({ id: task.id }) });
    if (task.status === 'IN_PROGRESS' && can('task:complete', task))
      actions.push({ label: 'Mark complete', onClick: () => complete.mutate({ id: task.id }) });
    if (task.status === 'COMPLETED' && can('task:close', task))
      actions.push({ label: 'Close', onClick: () => close.mutate({ id: task.id }) });
    return actions;
  }, [task.status, can]);

  if (!items.length) return null;
  return <DropdownMenu items={items} trigger={<Button>Actions ▾</Button>} />;
}
```

### 13.3 Confirmation Dialogs

Destructive or high-impact actions (Reject, Close, Delete) always require confirmation **with a reason field**:

```tsx
function RejectDialog({ task, open, onClose }: Props) {
  const reject = useRejectTask();
  const { register, handleSubmit, formState } = useForm<{ reason: string }>({
    resolver: zodResolver(z.object({ reason: z.string().min(10, 'Provide a reason of at least 10 characters') })),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject "{task.title}"</DialogTitle>
          <DialogDescription>This sends the task back to DRAFT. The creator will be notified.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => reject.mutate({ id: task.id, reason: v.reason }, { onSuccess: onClose }))}>
          <Textarea {...register('reason')} placeholder="Reason for rejection…" />
          {formState.errors.reason && <ErrorText>{formState.errors.reason.message}</ErrorText>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" type="submit" loading={reject.isPending}>Reject task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 13.4 Optimistic Status Changes

Status flips immediately; rolls back on error. See `useApproveTask` in Part 1 §6.2. The same pattern applies to start/complete/close/reject.

### 13.5 History Tab

Read-only timeline from `GET /tasks/{id}/history/`:

```tsx
function HistoryTimeline({ taskId }: { taskId: string }) {
  const { data } = useTaskHistory(taskId);
  if (!data?.length) return <EmptyState title="No history yet" />;
  return (
    <ol className="relative border-l-2 pl-4">
      {data.map((row) => (
        <li key={row.id} className="mb-6">
          <StatusBadge status={row.old_status} /> → <StatusBadge status={row.new_status} />
          <p className="text-sm text-muted-foreground">
            by {row.changed_by_name} · {formatRelative(row.timestamp)}
          </p>
          {row.reason && <p className="mt-1">{row.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
```

### 13.6 SLA Indicator

The backend serializer returns `is_overdue`, `is_sla_breached`, `elapsed_hours`. Render a progress bar:

```tsx
function SLAIndicator({ task }: { task: Task }) {
  const pct = Math.min(100, (task.elapsed_hours / task.sla_hours) * 100);
  const tone = task.is_sla_breached ? 'destructive' : pct > 80 ? 'warning' : 'default';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>SLA</span>
        <span>{task.elapsed_hours.toFixed(1)}h / {task.sla_hours}h</span>
      </div>
      <Progress value={pct} tone={tone} />
      {task.is_sla_breached && <Badge variant="destructive">Breached</Badge>}
    </div>
  );
}
```

---

## 14. Feature: Kanban Board

### 14.1 Columns

One column per workflow status: DRAFT, PENDING_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED, CLOSED.

### 14.2 Interactions

- **Drag-and-drop between columns** fires the appropriate workflow action.
- Invalid transitions (e.g. DRAFT → IN_PROGRESS) show a red outline + toast and snap back.
- Users without the required role simply can't drag (handle shown as disabled).

### 14.3 Implementation — @dnd-kit

```tsx
// src/features/tasks/components/kanban-board.tsx
import { DndContext, DragEndEvent, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';
import { useTasks } from '../api/use-tasks';
import { useCan } from '@/shared/auth/permissions';
import { statusToAction, canTransition } from '../utils/transitions';
import { useWorkflowMutation } from '@/features/workflow/api/use-workflow';
import { toast } from 'sonner';

const COLUMNS: TaskStatus[] = ['DRAFT','PENDING_APPROVAL','APPROVED','IN_PROGRESS','COMPLETED','CLOSED'];

export function KanbanBoard() {
  const { data } = useTasks({ page_size: 200 });
  const can = useCan();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const workflow = useWorkflowMutation();

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = Object.fromEntries(COLUMNS.map((c) => [c, []])) as any;
    data?.results.forEach((t) => map[t.status as TaskStatus].push(t));
    return map;
  }, [data]);

  const handleDragEnd = (e: DragEndEvent) => {
    const taskId = e.active.id as string;
    const targetStatus = e.over?.id as TaskStatus | undefined;
    if (!targetStatus) return;

    const task = data!.results.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    if (!canTransition(task.status as TaskStatus, targetStatus)) {
      toast.error(`Cannot move from ${task.status} to ${targetStatus}`);
      return;
    }
    const action = statusToAction(task.status as TaskStatus, targetStatus);
    if (!can(action, task)) {
      toast.error('You do not have permission for this action');
      return;
    }
    workflow.mutate({ action, taskId, reason: '' });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {COLUMNS.map((status) => (
          <KanbanColumn key={status} status={status} tasks={byStatus[status]} />
        ))}
      </div>
    </DndContext>
  );
}
```

### 14.4 Transition Map Helper

```ts
// src/features/tasks/utils/transitions.ts
const EDGES: Record<TaskStatus, TaskStatus[]> = {
  DRAFT:            ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT'],
  APPROVED:         ['IN_PROGRESS'],
  IN_PROGRESS:      ['COMPLETED'],
  COMPLETED:        ['CLOSED'],
  CLOSED:           [],
};

export function canTransition(from: TaskStatus, to: TaskStatus) {
  return EDGES[from]?.includes(to) ?? false;
}

export function statusToAction(from: TaskStatus, to: TaskStatus): Action {
  if (from === 'DRAFT' && to === 'PENDING_APPROVAL') return 'task:submit';
  if (from === 'PENDING_APPROVAL' && to === 'APPROVED') return 'task:approve';
  if (from === 'PENDING_APPROVAL' && to === 'DRAFT') return 'task:reject';
  if (from === 'APPROVED' && to === 'IN_PROGRESS') return 'task:start';
  if (from === 'IN_PROGRESS' && to === 'COMPLETED') return 'task:complete';
  if (from === 'COMPLETED' && to === 'CLOSED') return 'task:close';
  throw new Error(`Unmapped transition ${from} → ${to}`);
}
```

---

## 15. Feature: Task Create / Edit Forms

### 15.1 Schema (mirrors backend)

```ts
// src/features/tasks/schemas/task-form.ts
import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().min(10, 'At least 10 characters').max(150, 'Max 150 characters'),
  description: z.string().max(5000).optional().default(''),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  due_date: z.coerce.date().refine((d) => d > new Date(), 'Must be in the future'),
  sla_hours: z.coerce.number().int().positive('Must be positive'),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

// Edit — same but all fields optional
export const taskUpdateSchema = taskCreateSchema.partial();
```

### 15.2 Server-Side Errors Mapped to Fields

DRF returns validation errors keyed by field. Map them to RHF:

```tsx
const form = useForm<TaskCreateInput>({ resolver: zodResolver(taskCreateSchema) });
const createTask = useCreateTask();

const onSubmit = form.handleSubmit((values) =>
  createTask.mutate(values, {
    onError: (error) => {
      if (error.isValidation() && error.details) {
        Object.entries(error.details).forEach(([field, messages]) => {
          form.setError(field as keyof TaskCreateInput, {
            message: Array.isArray(messages) ? messages[0] : String(messages),
          });
        });
      }
    },
    onSuccess: (task) => navigate(`/tasks/${task.id}`),
  })
);
```

### 15.3 Dirty Form Guard

Prevent accidental loss of changes:

```tsx
function useDirtyFormGuard(isDirty: boolean) {
  useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname
  );
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
```

### 15.4 Autosave Draft (optional enhancement)

Persist unsaved task drafts to Zustand `drafts` store, re-hydrate on mount. Clear on successful create.

---

## 16. Feature: Comments

### 16.1 Data Flow

- `GET /comments/?task={id}` — list
- `POST /comments/` — create (task, content, is_internal)
- Internal comments only visible/creatable by ADMIN/MANAGER

### 16.2 UI

- Threaded list, newest at bottom (ChatGPT-style) or newest at top (toggle in prefs)
- Internal comments visually distinct (yellow accent border, "Internal" badge)
- Text area with Ctrl/Cmd+Enter submit
- Optimistic append (comment appears instantly; rolls back on error)
- Real-time refresh on a 15 s interval when tab is focused

```tsx
function Comments({ taskId }: { taskId: string }) {
  const { data } = useComments(taskId);
  const can = useCan();
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {data?.results.map((c) => <CommentItem key={c.id} comment={c} />)}
      </ul>
      <CommentComposer taskId={taskId} allowInternal={can('comment:create-internal')} />
    </div>
  );
}
```

### 16.3 Optimistic Append

```ts
export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => api.post<Comment>(ep.comments, input).then((r) => r.data),
    onMutate: async (input) => {
      const key = commentKeys.list(input.task);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PaginatedResponse<Comment>>(key);
      qc.setQueryData(key, (old: any) => ({
        ...old,
        results: [...(old?.results ?? []), optimisticComment(input)],
      }));
      return { prev };
    },
    onError: (_e, input, ctx) => qc.setQueryData(commentKeys.list(input.task), ctx?.prev),
    onSettled: (_d, _e, input) => qc.invalidateQueries({ queryKey: commentKeys.list(input.task) }),
  });
}
```

---

## 17. Feature: Attachments

### 17.1 Upload Flow

- `POST /attachments/` with multipart/form-data (file + task id)
- Backend validates file type (whitelist from settings) and size (max 10 MB default)
- Frontend enforces the same rules client-side for instant feedback

### 17.2 Upload Component

```tsx
function AttachmentUploader({ taskId }: { taskId: string }) {
  const upload = useUploadAttachment();
  const [progress, setProgress] = useState(0);

  const onFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!isAllowedType(file)) return toast.error(`${file.name}: type not allowed`);
      if (file.size > MAX_SIZE) return toast.error(`${file.name}: too large (max 10 MB)`);
      upload.mutate({ taskId, file, onProgress: setProgress });
    });
  };

  return (
    <DropZone onDrop={onFiles}>
      <p>Drop files here or click to upload</p>
      {upload.isPending && <Progress value={progress} />}
    </DropZone>
  );
}
```

### 17.3 Upload Progress

```ts
export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, file, onProgress }: UploadInput) => {
      const fd = new FormData();
      fd.append('task', taskId);
      fd.append('file', file);
      const { data } = await api.post<Attachment>(ep.attachments, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      return data;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: attachmentKeys.list(vars.taskId) }),
  });
}
```

### 17.4 File Preview

- Images (png/jpg/jpeg) — inline thumbnail + lightbox modal
- PDFs — browser-native iframe preview
- Other types — icon + filename + download button

### 17.5 Security Considerations

- **No inline execution.** Always download or preview via sandboxed iframe.
- **Content-Disposition** on the backend ensures downloads for non-previewable types.
- **Virus scanning** is out of scope for v1; add to roadmap.

---

## 18. Feature: Notifications (Realtime)

### 18.1 UX

- Bell icon in header with unread count badge
- Click → dropdown with latest 10, link to full `/notifications`
- Click a notification → navigate to linked task + mark as read
- Full page has "Mark all as read" + filter (all / unread / by type)

### 18.2 Delivery Strategies — Phased

| Phase | Mechanism | Pros | Cons |
|---|---|---|---|
| **Phase 1 (MVP)** | Polling `/notifications/?is_read=false&page_size=10` every 30 s when tab is focused | Zero backend changes | 30 s lag, extra requests |
| **Phase 2** | Server-Sent Events (SSE) on `/notifications/stream/` | One-way real-time, simpler than WS | Requires backend endpoint |
| **Phase 3** | WebSockets via Django Channels + Redis PubSub | Bidirectional, scales | Most infra complexity |

### 18.3 Phase-1 Polling Hook

```ts
// src/features/notifications/api/use-notifications.ts
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';

export function useUnreadNotifications() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async () => (await api.get(ep.notifications.list, { params: { is_read: false, page_size: 10 } })).data,
    enabled: !!user,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
```

### 18.4 Phase-2 SSE Upgrade

```ts
export function useNotificationStream() {
  const qc = useQueryClient();
  useEffect(() => {
    const es = new EventSource(`${env.VITE_API_BASE_URL}/notifications/stream/`, { withCredentials: true });
    es.onmessage = (e) => {
      const notif = JSON.parse(e.data) as Notification;
      qc.setQueryData<PaginatedResponse<Notification>>(notificationKeys.unread(), (old) => ({
        ...old!,
        results: [notif, ...(old?.results ?? [])],
        count: (old?.count ?? 0) + 1,
      }));
      toast.info(notif.title, { description: notif.message });
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [qc]);
}
```

### 18.5 Desktop Notifications

Request permission once on first visit after login; surface high-priority notifications as browser notifications when tab is in background.

```ts
if ('Notification' in window && Notification.permission === 'default') {
  await Notification.requestPermission();
}
if (Notification.permission === 'granted' && document.hidden) {
  new Notification(notif.title, { body: notif.message, icon: '/favicon.svg' });
}
```

---

## 19. Feature: Admin — Users & Roles

### 19.1 Gated Routes

Only visible to `ADMIN`. See `RequireRole` in Part 1 §7.5.

### 19.2 Users Page

- Data table: email, name, active, roles, last login, created
- Actions per row: View, Edit, Activate/Deactivate, Manage roles
- Filters: role, active status, search (email)
- Create user drawer: email, name, initial password, roles

### 19.3 Manage Roles Modal

- Multi-select of roles currently assigned (Role objects from `/roles/`)
- Add role → POST `/user-roles/`
- Remove role → DELETE `/user-roles/{id}/`
- Explicit confirmation before removing ADMIN role from the last admin

### 19.4 Audit Bias

Admin actions are high-stakes — every write triggers:
- Confirmation dialog with explicit consequences
- Toast + log to `logger` (goes to Sentry breadcrumb)

---

## 20. Feature: Settings — Notification Preferences

### 20.1 UI

One form per notification type (task_assigned, task_approved, etc.), each a toggle. Plus one `email_frequency` select (immediate / daily / weekly / never).

```tsx
function NotificationPreferencesForm() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const { register, handleSubmit, formState } = useForm({
    defaultValues: prefs,
    resolver: zodResolver(notificationPrefsSchema),
  });

  return (
    <form onSubmit={handleSubmit((v) => update.mutate(v))}>
      <ToggleField label="Task assigned to me" {...register('task_assigned')} />
      <ToggleField label="Task approved" {...register('task_approved')} />
      {/* ... */}
      <SelectField label="Email frequency" {...register('email_frequency')}>
        <option value="immediate">Immediate</option>
        <option value="daily">Daily digest</option>
        <option value="weekly">Weekly digest</option>
        <option value="never">Never</option>
      </SelectField>
      <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>Save</Button>
    </form>
  );
}
```

### 20.2 Save Semantics

- Save button disabled until form is dirty
- Toast on success: "Preferences saved"
- On error: field-level errors + toast

---

## 21. Cross-Cutting: Forms & Validation

### 21.1 Shared FormField Component

All fields render label + input + error text + help text with consistent spacing:

```tsx
// src/shared/ui/form/form-field.tsx
type Props = { label: string; error?: string; help?: string; children: React.ReactNode; required?: boolean };
export function FormField({ label, error, help, required, children }: Props) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}{required && <span className="text-destructive" aria-label="required"> *</span>}
      </label>
      {React.cloneElement(children as React.ReactElement, { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined })}
      {help && !error && <p className="text-sm text-muted-foreground">{help}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

### 21.2 Validation Rules Parity

Every serializer's validation must have a matching Zod schema. Track parity in a table in the README:

| Backend validation (`serializers.py`) | Zod equivalent |
|---|---|
| Title 10–150 chars | `z.string().min(10).max(150)` |
| Due date in future | `.refine((d) => d > new Date())` |
| SLA > 0 | `.int().positive()` |
| Email | `z.string().email()` |
| Password min 8 | `z.string().min(8)` |

### 21.3 Async Field Validation

For uniqueness checks (e.g. "email already registered"), prefer server-side validation on submit; avoid per-keystroke API calls unless UX demands it (use `useDebounce` + `useQuery` with `enabled` gate).

---

## 22. Cross-Cutting: Realtime Strategy

Covered by feature in §18. Summary principles:

1. **Polling is fine for v1.** 30 s is acceptable for a task-management app. Don't over-engineer.
2. **Use `refetchOnWindowFocus` + `refetchInterval`.** Let TanStack Query do the work.
3. **Optimistic updates cover the user's own actions.** They see instant feedback regardless of network state.
4. **SSE before WebSockets.** SSE is one-way (server → client), which is all notifications need. WebSockets add complexity for little gain.
5. **Degrade gracefully.** If SSE/WS disconnects, fall back to polling automatically.
6. **Page Visibility API.** Pause polling when the tab is hidden; resume on focus.

---

## 23. Cross-Cutting: Performance Engineering

### 23.1 Budgets

Enforced in CI via `size-limit` or `bundlemon`:

| Chunk | Budget (gzipped) |
|---|---|
| Initial route (login or dashboard) | 180 KB |
| Task detail route | 120 KB |
| Kanban route | 180 KB (includes @dnd-kit) |
| Admin route | 100 KB |
| Vendor chunk (react + router + query) | 150 KB |

### 23.2 Image & Font Strategy

- SVG icons only (via `lucide-react`)
- User avatars: lazy-loaded + `loading="lazy"` + fallback initials
- System fonts first, Inter as web font with `font-display: swap`

### 23.3 Virtualization Thresholds

| Component | Virtualize when |
|---|---|
| Task table | > 100 rows |
| Notification list | > 50 items |
| Comment thread | > 30 items |
| History timeline | > 50 items |

### 23.4 Suspense for Data

Use `useSuspenseQuery` at the route level for first-load data so the route doesn't render until data is ready. Combine with a lightweight route-level `<Suspense fallback={<RouteSkeleton />}>`.

### 23.5 Memoization Discipline

- Don't reach for `useMemo`/`useCallback` reflexively — they have costs.
- Apply when: expensive compute (>1 ms), referential identity matters (useMemo → prop to memoized child), functions passed deep.
- Profile with React DevTools before optimizing.

### 23.6 Route-Level Data Prefetching

```tsx
// When the layout knows the next route (e.g. hovering "Tasks" in nav),
// prefetch its initial query.
<Link to="/tasks" onMouseEnter={() => qc.prefetchQuery({ queryKey: taskKeys.list({}), queryFn: ... })}>
```

### 23.7 Core Web Vitals Targets

| Metric | Target |
|---|---|
| LCP | < 2.0 s |
| INP | < 150 ms |
| CLS | < 0.1 |
| FCP | < 1.5 s |

Report to Sentry via `web-vitals`:

```ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
[onCLS, onINP, onLCP, onFCP, onTTFB].forEach((fn) => fn((metric) => {
  Sentry.captureMessage(`web-vital ${metric.name}`, { level: 'info', extra: metric });
}));
```

---

## 24. Cross-Cutting: Error Handling & Resilience

### 24.1 Error Taxonomy

| Type | Example | UX response |
|---|---|---|
| **Network** | Offline, DNS fail | Toast "Connection lost"; retry button on queries |
| **401** | Token expired | Silent refresh; if that fails, redirect to login |
| **403** | Role/permission denied | Toast "You don't have permission"; don't navigate |
| **404** | Task not found | Empty-state page with back button |
| **409** | Illegal workflow transition | Toast with backend's message (it's user-readable by contract) |
| **400** | Validation | Map to form fields |
| **500** | Server error | Toast "Something went wrong"; Sentry captures |

### 24.2 Error Boundaries

Three layers:

```
Root ErrorBoundary (last resort, shows "Reload" button)
  └─ Route ErrorBoundary (per route, shows contextual error + "Go home")
      └─ Feature ErrorBoundary (optional, per heavy widget like Kanban)
```

```tsx
// src/shared/components/error-boundary/route-error-boundary.tsx
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import * as Sentry from '@sentry/react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  useEffect(() => { Sentry.captureException(error); }, [error]);

  if (isRouteErrorResponse(error)) {
    return error.status === 404 ? <NotFoundPage /> : <GenericError error={error} />;
  }
  return <GenericError error={error} />;
}
```

### 24.3 Retry Policy

- **Queries** retry 2 times with exponential backoff for 5xx; 0 retries for 4xx.
- **Mutations** never auto-retry (avoid double-writes). User clicks the button again.
- **Uploads** expose a manual retry button on failure.

### 24.4 Offline Mode

- Detect via `navigator.onLine` + `online`/`offline` events
- Show persistent banner when offline
- Disable mutation buttons while offline
- TanStack Query automatically pauses fetches when offline and resumes on reconnection

### 24.5 Stale Data Detection

- If a mutation 409s because another user changed status first, invalidate the detail query → user sees fresh state
- Consider showing a "Data updated, refresh to see latest" toast when a 409 happens

---

**End of Part 2.** Continue with:
- `03_quality.md` — Testing, security, observability, a11y, DevEx, i18n
- `04_roadmap.md` — CI/CD, phased delivery, Definition of Done
