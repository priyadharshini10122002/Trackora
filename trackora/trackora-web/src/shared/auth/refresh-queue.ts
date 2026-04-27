import axios from 'axios';
import { env } from '@/shared/lib/env';
import { ep } from '@/shared/api/endpoints';
import { tokenStore, refreshStore } from '@/shared/auth/token-store';

let refreshPromise: Promise<string> | null = null;

async function executeRefresh(): Promise<string> {
  const refresh = refreshStore.get();
  if (!refresh) {
    tokenStore.clear();
    refreshStore.clear();
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post<{ access: string }>(
      `${env.VITE_API_BASE_URL}${ep.auth.refresh}`,
      { refresh },
    );
    const { access } = response.data;
    tokenStore.set(access);
    return access;
  } catch {
    tokenStore.clear();
    refreshStore.clear();
    throw new Error('Token refresh failed');
  }
}

/**
 * Single-flight token refresh — concurrent callers share a single
 * in-flight request and all receive the same resolved token.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = executeRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
