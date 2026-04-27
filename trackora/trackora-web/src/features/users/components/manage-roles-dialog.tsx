import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

import type { Role } from '@/shared/auth/permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Checkbox,
  Skeleton,
} from '@/shared/ui';

import { useUserRoles, useManageUserRole } from '../api/use-user-roles';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  MANAGER: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  CONTRIBUTOR: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  VIEWER: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

const ROLE_OPTIONS: { role: Role; label: string; description: string }[] = [
  { role: 'ADMIN', label: 'Admin', description: 'Full system access' },
  {
    role: 'MANAGER',
    label: 'Manager',
    description: 'Manage tasks and users',
  },
  {
    role: 'CONTRIBUTOR',
    label: 'Contributor',
    description: 'Create and work on tasks',
  },
  { role: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
];

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function ManageRolesDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ManageRolesDialogProps) {
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles(userId);
  const manageRole = useManageUserRole();

  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when remote roles load
  useEffect(() => {
    if (userRoles) {
      setSelectedRoles(new Set(userRoles.map((r) => r.role_name as Role)));
    }
  }, [userRoles]);

  const currentRoles = new Set(
    userRoles?.map((r) => r.role_name as Role) ?? [],
  );

  const isRemovingLastAdmin =
    currentRoles.has('ADMIN') &&
    !selectedRoles.has('ADMIN') &&
    (userRoles?.filter((r) => r.role_name === 'ADMIN').length ?? 0) <= 1;

  function handleToggle(role: Role, checked: boolean) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(role);
      } else {
        next.delete(role);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!userRoles) return;

    const rolesToAdd = [...selectedRoles].filter((r) => !currentRoles.has(r));
    const rolesToRemove = [...currentRoles].filter(
      (r) => !selectedRoles.has(r),
    );

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);

    try {
      for (const role of rolesToAdd) {
        await manageRole.mutateAsync({
          action: 'add',
          userId,
          role,
        });
      }

      for (const role of rolesToRemove) {
        const assignment = userRoles.find((r) => r.role_name === role);
        if (assignment) {
          await manageRole.mutateAsync({
            action: 'remove',
            userId,
            role,
            roleAssignmentId: assignment.id,
          });
        }
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Update role assignments for {userName || 'this user'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {rolesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-0.5 h-4 w-4" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {isRemovingLastAdmin && (
                <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Warning: Removing the last Admin role may lock you out of
                    admin features.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {ROLE_OPTIONS.map(({ role, label, description }) => {
                  const colorClass = ROLE_COLORS[role] ?? '';
                  const isChecked = selectedRoles.has(role);
                  return (
                    <label
                      key={role}
                      className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
                        isChecked
                          ? `${colorClass} border-current/20`
                          : 'border-border/50 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleToggle(role, checked === true)
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium leading-none">
                          {label}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={rolesLoading || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
