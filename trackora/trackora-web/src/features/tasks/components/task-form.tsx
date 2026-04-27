import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useBlocker } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui';
import { PRIORITIES } from '@/shared/config/constants';
import { taskCreateSchema, taskUpdateSchema } from '../schemas/task-form';
import type { TaskCreateInput, TaskUpdateInput } from '../schemas/task-form';

type TaskFormProps = {
  mode: 'create' | 'edit';
  defaultValues?: Partial<TaskCreateInput>;
  onSubmit: (data: TaskCreateInput | TaskUpdateInput) => void;
  isPending?: boolean;
  serverErrors?: Record<string, string[]>;
};

export function TaskForm({
  mode,
  defaultValues,
  onSubmit,
  isPending,
  serverErrors,
}: TaskFormProps) {
  const schema = mode === 'create' ? taskCreateSchema : taskUpdateSchema;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskCreateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      due_date: undefined,
      sla_hours: undefined,
      ...defaultValues,
    },
  });

  // Map server-side validation errors onto form fields
  useEffect(() => {
    if (!serverErrors) return;
    for (const [field, messages] of Object.entries(serverErrors)) {
      if (messages.length > 0) {
        setError(field as keyof TaskCreateInput, {
          type: 'server',
          message: messages[0],
        });
      }
    }
  }, [serverErrors, setError]);

  // Block navigation when the form has unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !isPending &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <FormField
          label="Title"
          htmlFor="title"
          error={errors.title?.message}
          required
        >
          <Input
            id="title"
            placeholder="Enter a descriptive task title"
            {...register('title')}
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            placeholder="Provide details about this task…"
            className="min-h-[200px]"
            {...register('description')}
          />
        </FormField>

        {/* Priority */}
        <FormField
          label="Priority"
          htmlFor="priority"
          error={errors.priority?.message}
          required
        >
          <Select
            defaultValue={defaultValues?.priority ?? 'MEDIUM'}
            onValueChange={(value) =>
              setValue('priority', value as TaskCreateInput['priority'], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Due Date */}
        <FormField
          label="Due Date"
          htmlFor="due_date"
          error={errors.due_date?.message}
        >
          <Input
            id="due_date"
            type="datetime-local"
            {...register('due_date')}
          />
        </FormField>

        {/* SLA Hours */}
        <FormField
          label="SLA Hours"
          htmlFor="sla_hours"
          error={errors.sla_hours?.message}
        >
          <Input
            id="sla_hours"
            type="number"
            min={1}
            placeholder="e.g. 24"
            {...register('sla_hours')}
          />
        </FormField>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Task' : 'Save Changes'}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tasks">Cancel</Link>
          </Button>
        </div>
      </form>

      {/* Dirty-form navigation guard */}
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={() => blocker.reset?.()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes that will be lost if you leave this page.
              Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stay
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
