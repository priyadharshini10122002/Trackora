import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient } from '@/shared/api/query-client';
import { router } from '@/app/router';
import { useAuthStore } from '@/features/auth/store';
import { refreshStore, tokenStore } from '@/shared/auth/token-store';
import { refreshAccessToken } from '@/shared/auth/refresh-queue';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import type { User } from '@/shared/types/api';

// ── Auth bootstrap ─────────────────────────────────────────────────

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    const refresh = refreshStore.get();
    if (!refresh) return;

    let cancelled = false;

    refreshAccessToken()
      .then(async () => {
        if (cancelled) return;
        const { data } = await api.get<User>('/auth/me/');
        if (cancelled) return;

        // Fetch user roles
        let roles: string[] = [];
        try {
          const rolesRes = await api.get<{ results: { role_name: string }[] }>(
            ep.userRoles,
          );
          roles = rolesRes.data.results.map((r) => r.role_name);
        } catch {
          // roles endpoint may not be available yet
        }

        setSession(data, roles);
      })
      .catch(() => {
        if (!cancelled) {
          tokenStore.clear();
          refreshStore.clear();
          clear();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setSession, clear]);

  return <>{children}</>;
}

// ── Providers ──────────────────────────────────────────────────────

function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster position="top-right" richColors closeButton />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export { Providers };
