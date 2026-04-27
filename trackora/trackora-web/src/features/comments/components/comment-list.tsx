import { MessageSquare } from 'lucide-react';
import type { Comment } from '@/shared/types/api';
import type { Role } from '@/shared/auth/permissions';
import { useRoles } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/date';
import { Avatar, AvatarFallback } from '@/shared/ui';
import { Badge } from '@/shared/ui';
import { Card, CardContent } from '@/shared/ui';
import { Skeleton } from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import { useComments } from '../api/use-comments';

interface CommentListProps {
  taskId: string;
}

const PRIVILEGED_ROLES: Role[] = ['ADMIN', 'MANAGER'];

function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  canSeeInternal,
}: {
  comment: Comment;
  canSeeInternal: boolean;
}) {
  if (comment.is_internal && !canSeeInternal) return null;

  const initials = (comment.author_name ?? '?').charAt(0).toUpperCase();

  return (
    <Card
      className={cn(
        'border-border/50 transition-all duration-200 hover:shadow-[var(--shadow-card)] hover:border-border',
        comment.is_internal &&
          'border-l-2 border-l-amber-400 bg-amber-500/[0.03]',
      )}
    >
      <CardContent className="flex gap-3 p-4">
        <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.author_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelative(comment.created_at)}
            </span>
            {comment.is_internal && <Badge variant="warning">Internal</Badge>}
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {comment.content}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommentList({ taskId }: CommentListProps) {
  const { data, isLoading, isError } = useComments(taskId);
  const roles = useRoles();

  const canSeeInternal = roles.some((role) =>
    (PRIVILEGED_ROLES as readonly string[]).includes(role),
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load comments. Please try again.
      </p>
    );
  }

  const comments = data?.results ?? [];

  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No comments yet"
        description="Be the first to add a comment"
      />
    );
  }

  return (
    <div className="stagger-children space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          canSeeInternal={canSeeInternal}
        />
      ))}
    </div>
  );
}
