import { useUser, useRoles } from '@/features/auth/store';
import {
  useTaskStats,
  StatsGrid,
  NeedsApprovalList,
  MyActiveWork,
  RecentNotifications,
  SLARiskList,
} from '@/features/dashboard';
import { formatDate } from '@/shared/lib/date';
import type { Role } from '@/shared/auth/permissions';
import { Sparkles } from 'lucide-react';

function DashboardPage() {
  const user = useUser();
  const roles = useRoles();
  const { data: stats, isLoading } = useTaskStats();

  const isManagerOrAdmin = roles.some(
    (r) => r === ('ADMIN' satisfies Role) || r === ('MANAGER' satisfies Role),
  );

  return (
    <div className="space-y-8">
      {/* Premium gradient hero welcome */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-indigo-700 px-8 py-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(280_80%_70%_/_0.15),_transparent_50%),_radial-gradient(ellipse_at_bottom_left,_hsl(200_90%_60%_/_0.1),_transparent_50%)]" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm animate-scale-in">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.first_name ?? 'there'}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {formatDate(new Date())} — Here&apos;s your overview
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards with stagger animation */}
      <section className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Overview
        </h2>
        <StatsGrid stats={stats} isLoading={isLoading} />
      </section>

      {/* Main content grid */}
      <section className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isManagerOrAdmin ? <NeedsApprovalList /> : <MyActiveWork />}
          <RecentNotifications />
        </div>
      </section>

      {/* SLA Risk section */}
      <section className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
        <SLARiskList />
      </section>
    </div>
  );
}

export default DashboardPage;
