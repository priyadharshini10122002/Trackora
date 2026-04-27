import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useIsAuthenticated, useRoles } from '@/features/auth/store';
import type { Role } from '@/shared/auth/permissions';

// ── RequireAuth ────────────────────────────────────────────────────

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ── RequireRole ────────────────────────────────────────────────────

function RequireRole({
  allowed,
  children,
}: {
  allowed: Role[];
  children: ReactNode;
}) {
  const roles = useRoles();
  const hasRole = roles.some((r) => allowed.includes(r as Role));

  if (!hasRole) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export { RequireAuth, RequireRole };
