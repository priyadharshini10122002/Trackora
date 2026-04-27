import type { TaskStats } from '@/shared/types/api';
import { Card, CardContent, Skeleton } from '@/shared/ui';
import {
  ClipboardList,
  FileEdit,
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type StatItem = {
  label: string;
  key: keyof TaskStats;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

const STAT_ITEMS: readonly StatItem[] = [
  {
    label: 'Total Tasks',
    key: 'total',
    icon: ClipboardList,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    label: 'Draft',
    key: 'draft',
    icon: FileEdit,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    label: 'Pending Approval',
    key: 'pending_approval',
    icon: Clock,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    label: 'In Progress',
    key: 'in_progress',
    icon: Play,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    label: 'Completed',
    key: 'completed',
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    label: 'Overdue',
    key: 'overdue',
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    label: 'SLA Breached',
    key: 'sla_breached',
    icon: AlertOctagon,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
] as const;

type StatsGridProps = {
  stats: TaskStats | undefined;
  isLoading: boolean;
};

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardContent className="flex items-center gap-4 p-5">
            {isLoading ? (
              <>
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </>
            ) : (
              <>
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}
                >
                  <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold tracking-tight">
                    {stats?.[item.key] ?? 0}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
