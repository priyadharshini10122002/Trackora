import { useNavigate, Link } from 'react-router-dom';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { z } from 'zod';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui';
import { PageHeader } from '@/shared/components/page-header';
import { Pagination } from '@/shared/components/pagination';
import { EmptyState } from '@/shared/components/empty-state';
import { useCan } from '@/shared/auth/permissions';
import type { Role } from '@/shared/auth/permissions';
import { useRoles, useUser } from '@/features/auth/store';
import { useUrlState } from '@/shared/hooks/use-url-state';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import {
  useTasks,
  TaskTable,
  TaskFilters as TaskFiltersBar,
  KanbanBoard,
} from '@/features/tasks';
import type { TaskFilters } from '@/features/tasks';

const filterSchema = z.object({
  status: z.string().default(''),
  priority: z.string().default(''),
  search: z.string().default(''),
  page: z.coerce.number().default(1),
  page_size: z.coerce.number().default(DEFAULT_PAGE_SIZE),
  view: z.string().default('table'),
});

type Filters = z.infer<typeof filterSchema>;

function TasksPage() {
  const navigate = useNavigate();
  const user = useUser();
  const roles = useRoles();
  const can = useCan(roles as Role[], user?.id);

  const [filters, setFilters] = useUrlState(filterSchema, {
    status: '',
    priority: '',
    search: '',
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    view: 'table',
  });

  const taskFilters: TaskFilters = {
    status: filters.status,
    priority: filters.priority,
    search: filters.search,
    page: filters.page,
    page_size: filters.page_size,
  };

  const { data, isLoading } = useTasks(taskFilters);

  const tasks = data?.results ?? [];
  const totalPages = Math.ceil((data?.count ?? 0) / filters.page_size);
  const hasFilters = !!(filters.status || filters.priority || filters.search);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage and track all tasks"
        actions={
          can('task:create') ? (
            <Button asChild>
              <Link to="/tasks/new">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Link>
            </Button>
          ) : undefined
        }
      />

      <TaskFiltersBar
        filters={filters}
        onFilterChange={(updates) =>
          setFilters({ ...updates, page: 1 } as Partial<Filters>)
        }
      />

      <Tabs
        value={filters.view}
        onValueChange={(value) => setFilters({ view: value })}
      >
        <TabsList>
          <TabsTrigger value="table">
            <List className="mr-2 h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {isLoading ? (
            <TaskTable tasks={[]} isLoading />
          ) : tasks.length === 0 ? (
            hasFilters ? (
              <EmptyState
                title="No tasks match your filters"
                description="Try adjusting your search or filter criteria"
              />
            ) : (
              <EmptyState
                title="No tasks yet"
                description="Get started by creating your first task"
                action={{
                  label: 'Create Task',
                  onClick: () => navigate('/tasks/new'),
                }}
              />
            )
          ) : (
            <TaskTable
              tasks={tasks}
              onRowClick={(task) => navigate(`/tasks/${task.id}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <KanbanBoard tasks={[]} isLoading />
          ) : tasks.length === 0 ? (
            hasFilters ? (
              <EmptyState
                title="No tasks match your filters"
                description="Try adjusting your search or filter criteria"
              />
            ) : (
              <EmptyState
                title="No tasks yet"
                description="Get started by creating your first task"
                action={{
                  label: 'Create Task',
                  onClick: () => navigate('/tasks/new'),
                }}
              />
            )
          ) : (
            <KanbanBoard
              tasks={tasks}
              onTaskClick={(task) => navigate(`/tasks/${task.id}`)}
            />
          )}
        </TabsContent>
      </Tabs>

      {filters.view === 'table' && (
        <Pagination
          currentPage={filters.page}
          totalPages={totalPages}
          onPageChange={(page) => setFilters({ page })}
        />
      )}
    </div>
  );
}

export default TasksPage;
