import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { User, PaginatedResponse } from '@/shared/types/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Label,
  Skeleton,
} from '@/shared/ui';

type AssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirm: (userId: string) => void;
  currentAssignee?: string | null;
};

export function AssignDialog({
  open,
  onOpenChange,
  isLoading,
  onConfirm,
  currentAssignee,
}: AssignDialogProps) {
  const [selectedUser, setSelectedUser] = useState(currentAssignee ?? '');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>(ep.users);
      return data;
    },
    enabled: open,
  });

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedUser(currentAssignee ?? '');
    onOpenChange(next);
  }

  function handleConfirm() {
    if (selectedUser) onConfirm(selectedUser);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
          <DialogDescription>
            Select a team member to assign this task to.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor="assign-user">Assignee</Label>

          {usersQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="assign-user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {usersQuery.data?.results?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isLoading || !selectedUser}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
