import { AlertTriangle } from 'lucide-react';
import type { Task } from '@/shared/types/api';
import {
  Card,
  CardContent,
  Avatar,
  AvatarFallback,
  Badge,
  Progress,
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
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

export function TaskDetailSidebar({ task }: TaskDetailSidebarProps) {
  const slaPercent =
    task.sla_hours != null && task.sla_hours > 0
      ? Math.min(Math.round((task.elapsed_hours / task.sla_hours) * 100), 100)
      : null;

  const slaVariant =
    slaPercent != null
      ? slaPercent > 100
        ? 'destructive'
        : slaPercent > 80
          ? 'warning'
          : 'default'
      : 'default';

  const createdInitial = (task.created_by ?? '?')[0].toUpperCase();
  const assignedInitial = task.assigned_to
    ? task.assigned_to[0].toUpperCase()
    : null;

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-0 p-5">
        {/* Created By */}
        <SidebarSection label="Created By">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{createdInitial}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">User {task.created_by}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelative(task.created_at)}
              </p>
            </div>
          </div>
        </SidebarSection>

        <Separator className="my-4" />

        {/* Assigned To */}
        <SidebarSection label="Assigned To">
          {task.assigned_to ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {assignedInitial}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium">User {task.assigned_to}</p>
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Unassigned
            </Badge>
          )}
        </SidebarSection>

        <Separator className="my-4" />

        {/* SLA Indicator */}
        <SidebarSection label="SLA">
          {task.sla_hours != null && task.sla_hours > 0 ? (
            <div className="space-y-2">
              <Progress
                value={slaPercent ?? 0}
                className={cn(
                  'h-2',
                  slaVariant === 'destructive' && '[&>div]:bg-destructive',
                  slaVariant === 'warning' && '[&>div]:bg-amber-500',
                )}
              />
              <p className="text-sm text-muted-foreground">
                {task.elapsed_hours}h / {task.sla_hours}h
              </p>
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

        <Separator className="my-4" />

        {/* Due Date */}
        <SidebarSection label="Due Date">
          {task.due_date ? (
            <p
              className={cn(
                'flex items-center gap-1.5 text-sm',
                task.is_overdue && 'font-medium text-destructive',
              )}
            >
              {task.is_overdue && <AlertTriangle className="h-4 w-4" />}
              {formatAbsolute(task.due_date)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No due date</p>
          )}
        </SidebarSection>

        <Separator className="my-4" />

        {/* Metadata */}
        <SidebarSection label="Metadata">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="truncate font-mono text-xs max-w-[140px]">
                {task.id}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatAbsolute(task.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatAbsolute(task.updated_at)}</dd>
            </div>
          </dl>
        </SidebarSection>
      </CardContent>
    </Card>
  );
}
