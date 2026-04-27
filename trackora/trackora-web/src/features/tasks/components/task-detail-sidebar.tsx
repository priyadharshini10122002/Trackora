import { AlertTriangle } from 'lucide-react';
import type { Task } from '@/shared/types/api';
import {
  Card,
  CardContent,
  Avatar,
  AvatarFallback,
  Badge,
  Separator,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatRelative, formatAbsolute } from '@/shared/lib/date';

type TaskDetailSidebarProps = {
  task: Task;
};

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

export function TaskDetailSidebar({ task }: TaskDetailSidebarProps) {
  const slaPercent =
    task.sla_hours != null && task.sla_hours > 0
      ? Math.min(Math.round(((task.elapsed_hours ?? 0) / task.sla_hours) * 100), 100)
      : null;

  const slaVariant =
    slaPercent != null
      ? slaPercent > 100
        ? 'destructive'
        : slaPercent > 80
          ? 'warning'
          : 'default'
      : 'default';

  const createdName = task.created_by_name ?? 'Unknown';
  const createdInitial = createdName[0].toUpperCase();
  const assignedName = task.assigned_to_name ?? null;
  const assignedInitial = assignedName ? assignedName[0].toUpperCase() : null;

  return (
    <Card className="glass-subtle shadow-[var(--shadow-card)] animate-fade-in overflow-hidden">
      <CardContent className="space-y-0 p-5">
        {/* Created By */}
        <SidebarSection label="Created By">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-primary/10">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                {createdInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{createdName}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatRelative(task.created_at)}
              </p>
            </div>
          </div>
        </SidebarSection>

        <Separator className="my-4 opacity-50" />

        {/* Assigned To */}
        <SidebarSection label="Assigned To">
          {assignedName ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {assignedInitial}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold">{assignedName}</p>
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Unassigned
            </Badge>
          )}
        </SidebarSection>

        <Separator className="my-4 opacity-50" />

        {/* SLA Indicator */}
        <SidebarSection label="SLA">
          {task.sla_hours != null && task.sla_hours > 0 ? (
            <div className="space-y-2">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                    slaVariant === 'destructive'
                      ? 'bg-gradient-to-r from-red-400 to-red-600'
                      : slaVariant === 'warning'
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-primary/80 to-primary',
                  )}
                  style={{ width: `${slaPercent ?? 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium tabular-nums">
                  {task.elapsed_hours ?? 0}h / {task.sla_hours}h
                </p>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                    slaVariant === 'destructive'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : slaVariant === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-primary/10 text-primary',
                  )}
                >
                  {slaPercent}%
                </span>
              </div>
              {task.is_sla_breached && (
                <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  SLA Breached
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">N/A</p>
          )}
        </SidebarSection>

        <Separator className="my-4 opacity-50" />

        {/* Due Date */}
        <SidebarSection label="Due Date">
          {task.due_date ? (
            <p
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium',
                task.is_overdue && 'text-destructive',
              )}
            >
              {task.is_overdue && <AlertTriangle className="h-4 w-4" />}
              {formatAbsolute(task.due_date)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No due date</p>
          )}
        </SidebarSection>

        <Separator className="my-4 opacity-50" />

        {/* Metadata */}
        <SidebarSection label="Metadata">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-xs text-muted-foreground">ID</dt>
              <dd className="truncate font-mono text-[11px] max-w-[140px] bg-muted/50 px-2 py-0.5 rounded">
                {task.id}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium">{formatAbsolute(task.created_at)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-xs text-muted-foreground">Updated</dt>
              <dd className="text-sm font-medium">{task.updated_at ? formatAbsolute(task.updated_at) : '—'}</dd>
            </div>
          </dl>
        </SidebarSection>
      </CardContent>
    </Card>
  );
}
