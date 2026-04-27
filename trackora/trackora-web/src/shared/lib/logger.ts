const isDev = import.meta.env.DEV;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger: Record<'info' | 'warn' | 'error' | 'debug', LogFn> = {
  info: isDev ? (...args: unknown[]) => console.info('[INFO]', ...args) : noop,
  warn: isDev ? (...args: unknown[]) => console.warn('[WARN]', ...args) : noop,
  error: isDev ? (...args: unknown[]) => console.error('[ERROR]', ...args) : noop,
  debug: isDev ? (...args: unknown[]) => console.debug('[DEBUG]', ...args) : noop,
};
