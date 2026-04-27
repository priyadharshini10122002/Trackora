import { useState } from 'react';
import { Search, Settings2 } from 'lucide-react';

import type { User } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/date';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  Skeleton,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import { Pagination } from '@/shared/components/pagination';

import { useUsers } from '../api/use-users';
import { ManageRolesDialog } from './manage-roles-dialog';

function getInitials(user: User): string {
  if (user.full_name && user.full_name.trim()) {
    const parts = user.full_name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }
  const first = user.first_name?.[0] ?? '';
  const last = user.last_name?.[0] ?? '';
  return (first + last).toUpperCase() || user.email[0].toUpperCase();
}

function getFullName(user: User): string {
  if (user.full_name && user.full_name.trim()) return user.full_name;
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const params: Record<string, unknown> = { page };
  if (search) params.search = search;

  const { data, isLoading } = useUsers(params);

  // Client-side role filtering (backend UserViewSet doesn't support role filter)
  const filteredResults = data?.results.filter((user) => {
    if (roleFilter === 'all') return true;
    return user.roles?.includes(roleFilter);
  });

  const selectedUser =
    filteredResults?.find((u) => u.id === selectedUserId) ??
    data?.results.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 shadow-[var(--shadow-card)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Roles</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Joined</TableHead>
              <TableHead className="w-[120px] font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : !filteredResults?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48">
                  <EmptyState
                    title="No users found"
                    description="Try adjusting your search or filter criteria."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((user) => (
                <TableRow
                  key={user.id}
                  className="transition-colors duration-150 hover:bg-muted/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{getFullName(user)}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No roles
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.date_joined)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserId(user.id)}
                      className="transition-all duration-150 hover:shadow-sm"
                    >
                      <Settings2 className="mr-1.5 h-4 w-4" />
                      Manage Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.count > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(data.count / 10)}
          onPageChange={setPage}
        />
      )}

      {/* Manage Roles Dialog */}
      <ManageRolesDialog
        open={selectedUserId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
        userId={selectedUserId ?? ''}
        userName={selectedUser ? getFullName(selectedUser) : ''}
      />
    </div>
  );
}
