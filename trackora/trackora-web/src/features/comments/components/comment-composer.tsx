import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/shared/auth/permissions';
import { useRoles } from '@/features/auth';
import { Button } from '@/shared/ui';
import { Textarea } from '@/shared/ui';
import { Checkbox } from '@/shared/ui';
import { Label } from '@/shared/ui';
import { useCreateComment } from '../api/use-create-comment';

interface CommentComposerProps {
  taskId: string;
}

const PRIVILEGED_ROLES: Role[] = ['ADMIN', 'MANAGER'];

export function CommentComposer({ taskId }: CommentComposerProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const roles = useRoles();
  const { mutate, isPending } = useCreateComment();

  const canMarkInternal = roles.some((role) =>
    (PRIVILEGED_ROLES as readonly string[]).includes(role),
  );

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;

    mutate(
      { taskId, content: trimmed, is_internal: isInternal },
      {
        onSuccess: () => {
          setContent('');
          setIsInternal(false);
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="glass-subtle rounded-xl border border-border/50 p-4 shadow-sm">
      <div className="space-y-3">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          rows={3}
          className="border-border/50 bg-background/50 transition-all duration-200 focus:shadow-[var(--shadow-glow)]"
        />
        <div className="flex items-center justify-between">
          <div>
            {canMarkInternal && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal-note"
                  checked={isInternal}
                  onCheckedChange={(checked) => setIsInternal(checked === true)}
                  disabled={isPending}
                />
                <Label
                  htmlFor="internal-note"
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  Internal note
                </Label>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !content.trim()}
            className="transition-all duration-150"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
