import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { PaginatedResponse } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';

import { userKeys } from './keys';

export interface UserRoleAssignment {
  id: string;
  user: string;
  user_email: string;
  user_full_name: string;
  role: string;
  role_name: string;
  role_description: string;
  assigned_by: string | null;
  assigned_by_email: string | null;
  assigned_at: string;
}

interface ManageUserRoleInput {
  action: 'add' | 'remove';
  userId: string;
  role: string;
  roleAssignmentId?: string;
}

export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: userKeys.userRoles(userId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<UserRoleAssignment>>(ep.userRoles, {
        params: { user: userId },
      });
      return data.results;
    },
    enabled: !!userId,
  });
}

export function useManageUserRole() {
  return useMutation({
    mutationFn: async (input: ManageUserRoleInput) => {
      if (input.action === 'add') {
        const { data } = await api.post(`${ep.userRoles}assign_role/`, {
          user_id: input.userId,
          role_name: input.role,
        });
        return data;
      }

      await api.delete(`${ep.userRoles}${input.roleAssignmentId}/`);
    },
    onSuccess: (_data, variables) => {
      const label =
        variables.action === 'add' ? 'Role assigned' : 'Role removed';
      toast.success(label);

      void queryClient.invalidateQueries({
        queryKey: userKeys.userRoles(variables.userId),
      });
      void queryClient.invalidateQueries({
        queryKey: userKeys.lists(),
      });
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });
}
