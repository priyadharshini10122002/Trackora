import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { isAxiosError } from 'axios';
import { env } from '@/shared/lib/env';
import { logger } from '@/shared/lib/logger';
import { tokenStore } from '@/shared/auth/token-store';
import { refreshAccessToken } from '@/shared/auth/refresh-queue';
import { ApiError } from '@/shared/api/error';

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  config.headers.set('X-Correlation-ID', crypto.randomUUID());
  return config;
});

// ── Response interceptor ───────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) {
      throw ApiError.fromAxios(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return api(originalRequest);
      } catch {
        tokenStore.clear();
        logger.error('Token refresh failed — redirecting to login');
        throw ApiError.fromAxios(error);
      }
    }

    throw ApiError.fromAxios(error);
  },
);
