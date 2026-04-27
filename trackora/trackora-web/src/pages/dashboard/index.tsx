import { useUser, useRoles } from '@/features/auth/store';
import {
  useTaskStats,
  StatsGrid,
  NeedsApprovalList,
  MyActiveWork,
  RecentNotifications,
  SLARiskList,
} from '@/features/dashboard';
import { PageHeader } from '@/shared/components/page-header';
import { formatDate } from '@/shared/lib/date';
import type { Role } from '@/shared/auth/permissions';

function DashboardPage() {
  const user = useUser();
  const roles = useRoles();
  const { data: stats, isLoading } = useTaskStats();

  const isManagerOrAdmin = roles.some(
    (r) => r === ('ADMIN' satisfies Role) || r === ('MANAGER' satisfies Role),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.first_name ?? 'there'}`}
        description={formatDate(new Date())}
      />

      <StatsGrid stats={stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isManagerOrAdmin ? <NeedsApprovalList /> : <MyActiveWork />}
        <RecentNotifications />
      </div>

      <SLARiskList />
    </div>
  );
}

export default DashboardPage;
