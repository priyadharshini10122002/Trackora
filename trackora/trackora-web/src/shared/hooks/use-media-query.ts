import { useState, useEffect } from 'react';

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * @example
 * ```ts
 * const isMobile  = useMediaQuery('(max-width: 768px)');
 * const isDark    = useMediaQuery('(prefers-color-scheme: dark)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);

    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
