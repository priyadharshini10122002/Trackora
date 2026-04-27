import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';
import { PageHeader } from '@/shared/components/page-header';
import { TaskForm, useCreateTask } from '@/features/tasks';
import type { TaskCreateInput, TaskUpdateInput } from '@/features/tasks';
import { ApiError } from '@/shared/api/error';

function NewTaskPage() {
  const navigate = useNavigate();
  const { mutate: createTask, isPending, error } = useCreateTask();

  const serverErrors =
    error instanceof ApiError && error.details ? error.details : undefined;

  function handleSubmit(data: TaskCreateInput | TaskUpdateInput) {
    createTask(data as TaskCreateInput, {
      onSuccess: () => navigate('/tasks'),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="New Task" description="Create a new task" />
      </div>

      <Card>
        <CardContent className="p-6">
          <TaskForm
            mode="create"
            onSubmit={handleSubmit}
            isPending={isPending}
            serverErrors={serverErrors}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default NewTaskPage;
