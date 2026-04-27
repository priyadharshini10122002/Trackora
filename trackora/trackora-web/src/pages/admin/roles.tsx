import { useQuery } from '@tanstack/react-query';
import { Shield, Users, Eye, PenTool, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/shared/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from '@/shared/ui';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { userKeys } from '@/features/users';
import { EmptyState } from '@/shared/components/empty-state';

type RoleInfo = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
};

const ROLE_DEFINITIONS: RoleInfo[] = [
  {
    key: 'ADMIN',
    label: 'Administrator',
    description:
      'Full system access. Can manage all tasks, users, roles, and system settings.',
    icon: Crown,
    permissions: [
      'Manage all tasks',
      'Manage users',
      'Assign roles',
      'System settings',
      'View all data',
    ],
  },
  {
    key: 'MANAGER',
    label: 'Manager',
    description:
      'Can approve, reject, assign tasks and manage contributors. Has elevated workflow privileges.',
    icon: Shield,
    permissions: [
      'Approve & reject tasks',
      'Assign tasks',
      'Manage contributors',
      'View internal comments',
      'Close tasks',
    ],
  },
  {
    key: 'CONTRIBUTOR',
    label: 'Contributor',
    description:
      'Can create, edit, and work on tasks. Can submit tasks for approval and add comments.',
    icon: PenTool,
    permissions: [
      'Create tasks',
      'Edit own tasks',
      'Submit for approval',
      'Add comments',
      'Upload attachments',
    ],
  },
  {
    key: 'VIEWER',
    label: 'Viewer',
    description:
      'Read-only access to tasks and comments. Cannot make changes to any data.',
    icon: Eye,
    permissions: [
      'View tasks',
      'View comments',
      'View attachments',
    ],
  },
];

type RoleAssignment = {
  id: string;
  user: string;
  role: string;
};

function useRoleCounts() {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: async () => {
      const { data } = await api.get<RoleAssignment[]>(ep.userRoles);
      const counts: Record<string, number> = {};
      for (const assignment of data) {
        counts[assignment.role] = (counts[assignment.role] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 60_000,
  });
}

function RoleCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

function AdminRolesPage() {
  const { data: roleCounts, isLoading, error } = useRoleCounts();

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        title="Roles"
        description="Manage roles and permissions across the organization"
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <RoleCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Shield}
          title="Failed to load roles"
          description="An error occurred while loading role information."
        />
      ) : (
        <div className="stagger-children grid gap-6 md:grid-cols-2">
          {ROLE_DEFINITIONS.map((role) => {
            const Icon = role.icon;
            const count = roleCounts?.[role.key] ?? 0;

            return (
              <Card key={role.key} className="card-hover border-border/50 shadow-[var(--shadow-card)] transition-all duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {role.label}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {role.key}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {count} {count === 1 ? 'user' : 'users'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Permissions
                    </h4>
                    <ul className="space-y-1">
                      {role.permissions.map((perm) => (
                        <li
                          key={perm}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminRolesPage;
