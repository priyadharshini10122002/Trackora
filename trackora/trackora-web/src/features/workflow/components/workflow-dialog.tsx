import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Textarea,
  Label,
} from '@/shared/ui';
import type { WorkflowAction } from '../api/use-workflow';

type WorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: WorkflowAction;
  taskTitle: string;
  isLoading: boolean;
  onConfirm: (reason?: string) => void;
  requiresReason?: boolean;
};

const actionDescriptions: Record<WorkflowAction, string> = {
  submit:
    'This will submit the task for approval. It can no longer be edited until reviewed.',
  approve:
    'This will approve the task and make it available for assignment and work.',
  reject:
    'This will reject the task and return it to draft status. Please provide a reason.',
  assign: 'This will assign the task to a team member.',
  start: 'This will mark the task as in progress.',
  complete:
    'This will mark the task as completed and submit it for review.',
  close: 'This will close the task. This action cannot be easily undone.',
};

const actionColors: Record<string, string> = {
  approve: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-500/25',
  reject: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/25',
  close: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/25',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function WorkflowDialog({
  open,
  onOpenChange,
  action,
  taskTitle,
  isLoading,
  onConfirm,
  requiresReason = false,
}: WorkflowDialogProps) {
  const [reason, setReason] = useState('');

  const showReason = requiresReason || action === 'reject';
  const isDestructive = action === 'reject' || action === 'close';
  const customColor = actionColors[action];

  function handleOpenChange(next: boolean) {
    if (!next) setReason('');
    onOpenChange(next);
  }

  function handleConfirm() {
    onConfirm(showReason ? reason : undefined);
  }

  const canConfirm = !showReason || reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {capitalize(action)} &ldquo;{taskTitle}&rdquo;
          </DialogTitle>
          <DialogDescription>{actionDescriptions[action]}</DialogDescription>
        </DialogHeader>

        {showReason && (
          <div className="grid gap-2 py-2">
            <Label htmlFor="workflow-reason">Reason</Label>
            <Textarea
              id="workflow-reason"
              placeholder="Provide a reason…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {customColor && !isDestructive ? (
            <Button
              className={`${customColor} transition-all duration-150`}
              onClick={handleConfirm}
              disabled={isLoading || !canConfirm}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {capitalize(action)}
            </Button>
          ) : (
            <Button
              variant={isDestructive ? 'destructive' : 'primary'}
              onClick={handleConfirm}
              disabled={isLoading || !canConfirm}
              className="transition-all duration-150"
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {capitalize(action)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
