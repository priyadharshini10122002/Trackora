export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  notifications: () => [...dashboardKeys.all, 'notifications'] as const,
  pendingApproval: () => [...dashboardKeys.all, 'pending-approval'] as const,
  myWork: () => [...dashboardKeys.all, 'my-work'] as const,
  slaRisk: () => [...dashboardKeys.all, 'sla-risk'] as const,
};
