import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Paperclip,
  History,
} from 'lucide-react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  Card,
  CardContent,
} from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';
import {
  useTask,
  useTaskHistory,
  TaskDetailHeader,
  TaskDetailSidebar,
  HistoryTimeline,
  taskKeys,
} from '@/features/tasks';
import type { TaskStatus } from '@/shared/types/api';
import { toast } from 'sonner';
import { ep } from '@/shared/api/endpoints';
import { api } from '@/shared/api/client';
import { queryClient } from '@/shared/api/query-client';

const STATUS_ENDPOINT_MAP: Record<string, (id: string) => string> = {
  'DRAFT->PENDING_APPROVAL': ep.tasks.submit,
  'PENDING_APPROVAL->APPROVED': ep.tasks.approve,
  'PENDING_APPROVAL->DRAFT': ep.tasks.reject,
  'APPROVED->IN_PROGRESS': ep.tasks.start,
  'IN_PROGRESS->COMPLETED': ep.tasks.complete,
  'COMPLETED->CLOSED': ep.tasks.close,
};

function TaskDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}

function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, error } = useTask(id!);
  const { data: history, isLoading: isHistoryLoading } = useTaskHistory(id!);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task || !id) return;

    const key = `${task.status}->${newStatus}`;
    const getEndpoint = STATUS_ENDPOINT_MAP[key];
    if (!getEndpoint) return;

    try {
      await api.post(getEndpoint(id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.history(id) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
      ]);
      toast.success('Task status updated');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update task status',
      );
    }
  }

  if (isLoading) {
    return <TaskDetailSkeleton />;
  }

  if (!task || error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/tasks">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Tasks
          </Link>
        </Button>
        <EmptyState
          title="Task not found"
          description="The task you're looking for doesn't exist or has been removed"
        >
          <Button variant="outline" asChild>
            <Link to="/tasks">Back to Tasks</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TaskDetailHeader task={task} onStatusChange={handleStatusChange} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">
                <FileText className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="mr-2 h-4 w-4" />
                Attachments
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {task.description ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {task.description}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No description provided"
                  description="Add a description to help others understand this task"
                />
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Comments coming soon
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Attachments coming soon
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <HistoryTimeline
                history={history ?? []}
                isLoading={isHistoryLoading}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div>
          <TaskDetailSidebar task={task} />
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPage;
