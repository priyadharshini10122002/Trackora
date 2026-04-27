import type { TaskStats } from '@/shared/types/api';
import { Card, CardContent, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
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
  iconGradient: string;
  accentBorder: string;
  glowColor: string;
  isHighlight?: boolean;
};

const STAT_ITEMS: readonly StatItem[] = [
  {
    label: 'Total Tasks',
    key: 'total',
    icon: ClipboardList,
    iconGradient: 'from-blue-500 to-indigo-600',
    accentBorder: 'border-l-blue-500',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(220_80%_60%_/_0.25)]',
    isHighlight: true,
  },
  {
    label: 'Draft',
    key: 'draft',
    icon: FileEdit,
    iconGradient: 'from-slate-400 to-slate-600',
    accentBorder: 'border-l-slate-400',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(215_15%_50%_/_0.2)]',
  },
  {
    label: 'Pending Approval',
    key: 'pending_approval',
    icon: Clock,
    iconGradient: 'from-amber-400 to-orange-500',
    accentBorder: 'border-l-amber-500',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(38_90%_50%_/_0.25)]',
  },
  {
    label: 'In Progress',
    key: 'in_progress',
    icon: Play,
    iconGradient: 'from-blue-400 to-cyan-500',
    accentBorder: 'border-l-blue-500',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(210_80%_55%_/_0.25)]',
    isHighlight: true,
  },
  {
    label: 'Completed',
    key: 'completed',
    icon: CheckCircle,
    iconGradient: 'from-emerald-400 to-green-600',
    accentBorder: 'border-l-emerald-500',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(152_60%_42%_/_0.25)]',
  },
  {
    label: 'Overdue',
    key: 'overdue',
    icon: AlertTriangle,
    iconGradient: 'from-orange-500 to-red-500',
    accentBorder: 'border-l-orange-500',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(25_90%_55%_/_0.25)]',
  },
  {
    label: 'SLA Breached',
    key: 'sla_breached',
    icon: AlertOctagon,
    iconGradient: 'from-red-500 to-rose-600',
    accentBorder: 'border-l-red-500',
    glowColor: 'hover:shadow-[0_0_20px_-4px_hsl(0_72%_56%_/_0.25)]',
  },
] as const;

type StatsGridProps = {
  stats: TaskStats | undefined;
  isLoading: boolean;
};

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  return (
    <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_ITEMS.map((item) => (
        <Card
          key={item.key}
          className={cn(
            'card-hover glass-subtle border-l-4 overflow-hidden',
            item.accentBorder,
            item.glowColor,
          )}
        >
          <CardContent className="flex items-center gap-4 p-5">
            {isLoading ? (
              <>
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'animate-scale-in flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
                    item.iconGradient,
                  )}
                >
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      'text-2xl font-bold tracking-tight',
                      item.isHighlight &&
                        'bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent',
                    )}
                  >
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
