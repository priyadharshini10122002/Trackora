import { isAxiosError } from 'axios';
import type { ApiErrorPayload } from '@/shared/types/api';

function parsePayload(data: unknown): ApiErrorPayload | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message !== 'string') return undefined;
  return {
    error: typeof obj.error === 'string' ? obj.error : 'UNKNOWN',
    message: obj.message,
    type: typeof obj.type === 'string' ? obj.type : 'unknown',
    details:
      typeof obj.details === 'object' && obj.details !== null
        ? (obj.details as Record<string, string[]>)
        : undefined,
    correlation_id:
      typeof obj.correlation_id === 'string' ? obj.correlation_id : undefined,
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly type: string;
  readonly details: Record<string, string[]> | undefined;
  readonly correlationId: string | undefined;

  constructor(params: {
    status: number;
    code: string;
    type: string;
    message: string;
    details?: Record<string, string[]>;
    correlationId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.type = params.type;
    this.details = params.details;
    this.correlationId = params.correlationId;
  }

  static fromAxios(error: unknown): ApiError {
    if (!isAxiosError(error)) {
      return new ApiError({
        status: 0,
        code: 'UNKNOWN',
        type: 'unknown',
        message:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }

    const status = error.response?.status ?? 0;
    const payload = parsePayload(error.response?.data);

    const headers = error.response?.headers as
      | Record<string, unknown>
      | undefined;
    const correlationId =
      typeof headers?.['x-correlation-id'] === 'string'
        ? headers['x-correlation-id']
        : undefined;

    return new ApiError({
      status,
      code: payload?.error ?? error.code ?? 'UNKNOWN',
      type: payload?.type ?? 'unknown',
      message: payload?.message ?? error.message,
      details: payload?.details,
      correlationId: correlationId ?? payload?.correlation_id,
    });
  }

  isConflict(): boolean {
    return this.status === 409;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isValidation(): boolean {
    return this.status === 422 || this.type === 'validation_error';
  }
}
