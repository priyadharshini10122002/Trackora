import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
} from 'react-router-dom';
import { RootLayout } from '@/shared/components/app-shell';
import { RequireAuth, RequireRole } from '@/app/guards';
import { FullscreenSpinner } from '@/shared/components/loading-states';

// ── Lazy pages ─────────────────────────────────────────────────────

const LandingPage = lazy(() => import('@/pages/landing/index'));
const LoginPage = lazy(() => import('@/pages/auth/login'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const DashboardPage = lazy(() => import('@/pages/dashboard/index'));
const TasksPage = lazy(() => import('@/pages/tasks/index'));
const NewTaskPage = lazy(() => import('@/pages/tasks/new'));
const TaskDetailPage = lazy(() => import('@/pages/tasks/[id]'));
const NotificationsPage = lazy(() => import('@/pages/notifications/index'));
const SettingsPage = lazy(() => import('@/pages/settings/notifications'));
const AdminUsersPage = lazy(() => import('@/pages/admin/users'));
const AdminRolesPage = lazy(() => import('@/pages/admin/roles'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

// Inline forbidden page
function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <h1 className="text-4xl font-bold">403</h1>
      <p className="text-muted-foreground">
        You don't have permission to access this page.
      </p>
      <a href="/dashboard" className="text-primary underline">
        Back to Dashboard
      </a>
    </div>
  );
}

function SuspenseWrapper() {
  return (
    <Suspense fallback={<FullscreenSpinner />}>
      <Outlet />
    </Suspense>
  );
}

// ── Router ─────────────────────────────────────────────────────────

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public routes */}
      <Route element={<SuspenseWrapper />}>
        <Route index element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Authenticated routes */}
      <Route
        element={
          <RequireAuth>
            <RootLayout />
          </RequireAuth>
        }
      >
        <Route element={<SuspenseWrapper />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/new" element={<NewTaskPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Admin routes */}
          <Route
            path="admin"
            element={
              <RequireRole allowed={['ADMIN']}>
                <Outlet />
              </RequireRole>
            }
          >
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="roles" element={<AdminRolesPage />} />
          </Route>

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </>,
  ),
);
