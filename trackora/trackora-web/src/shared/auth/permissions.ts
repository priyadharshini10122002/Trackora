import { useCallback } from 'react';

export type Role = 'ADMIN' | 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';

export type Action =
  | 'task:create'
  | 'task:view'
  | 'task:edit'
  | 'task:delete'
  | 'task:submit'
  | 'task:approve'
  | 'task:reject'
  | 'task:assign'
  | 'task:start'
  | 'task:complete'
  | 'task:close'
  | 'comment:create'
  | 'comment:view'
  | 'comment:delete'
  | 'attachment:upload'
  | 'attachment:view'
  | 'attachment:delete'
  | 'user:view'
  | 'user:edit'
  | 'user:create'
  | 'user:delete'
  | 'role:view'
  | 'role:assign';

export const roleMatrix: Record<Action, readonly Role[]> = {
  'task:create': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:view': ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'],
  'task:edit': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:delete': ['ADMIN', 'MANAGER'],
  'task:submit': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:approve': ['ADMIN', 'MANAGER'],
  'task:reject': ['ADMIN', 'MANAGER'],
  'task:assign': ['ADMIN', 'MANAGER'],
  'task:start': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:complete': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:close': ['ADMIN', 'MANAGER'],
  'comment:create': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'comment:view': ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'],
  'comment:delete': ['ADMIN', 'MANAGER'],
  'attachment:upload': ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'attachment:view': ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'],
  'attachment:delete': ['ADMIN', 'MANAGER'],
  'user:view': ['ADMIN', 'MANAGER'],
  'user:edit': ['ADMIN'],
  'user:create': ['ADMIN'],
  'user:delete': ['ADMIN'],
  'role:view': ['ADMIN'],
  'role:assign': ['ADMIN'],
};

/** Actions that require the user to be the creator, assignee, or elevated role */
const RESOURCE_SCOPED_ACTIONS: readonly Action[] = [
  'task:edit',
  'task:start',
  'task:complete',
];

export interface TaskResource {
  created_by?: string;
  assigned_to?: string | null;
}

/**
 * RBAC permission check hook.
 *
 * @param userRoles - current user's assigned roles
 * @param userId    - current user's id (for resource-level ownership checks)
 * @returns a checker function `(action, resource?) => boolean`
 */
export function useCan(userRoles: Role[], userId?: string) {
  return useCallback(
    (action: Action, resource?: TaskResource): boolean => {
      const allowedRoles = roleMatrix[action];
      const hasRole = userRoles.some((r) => allowedRoles.includes(r));
      if (!hasRole) return false;

      // Resource-scoped ownership check
      if (resource && RESOURCE_SCOPED_ACTIONS.includes(action)) {
        const isElevated =
          userRoles.includes('ADMIN') || userRoles.includes('MANAGER');
        if (isElevated) return true;
        return (
          resource.created_by === userId || resource.assigned_to === userId
        );
      }

      return true;
    },
    [userRoles, userId],
  );
}
