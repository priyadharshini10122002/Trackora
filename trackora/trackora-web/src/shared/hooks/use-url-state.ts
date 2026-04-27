import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useCallback, useMemo, useRef } from 'react';

/**
 * Syncs state to the URL search params, validated through a Zod schema.
 *
 * @param schema  - Zod schema that describes the expected URL params.
 *                  Use `.default()` on fields to handle missing params.
 * @param defaults - fallback values when parsing fails.
 *
 * @example
 * ```ts
 * const filterSchema = z.object({
 *   page:   z.coerce.number().default(1),
 *   search: z.string().default(''),
 * });
 *
 * const [filters, setFilters] = useUrlState(filterSchema, { page: 1, search: '' });
 * ```
 */
export function useUrlState<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  defaults: T,
) {
  const defaultsRef = useRef(defaults);
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries());
    const merged = { ...defaultsRef.current, ...raw };
    const result = schema.safeParse(merged);
    return result.success ? result.data : defaultsRef.current;
  }, [searchParams, schema]);

  const setState = useCallback(
    (updates: Partial<T>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  return [state, setState] as const;
}
