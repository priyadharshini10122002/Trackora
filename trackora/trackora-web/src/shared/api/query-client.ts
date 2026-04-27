import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/error';

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError) {
    if ([401, 403, 404].includes(error.status)) return false;
  }
  return failureCount < 3;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: shouldRetry,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = '/login';
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : 'An unexpected error occurred';
      toast.error(message);
    },
  }),
});
