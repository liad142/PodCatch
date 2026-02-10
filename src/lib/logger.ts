const isDev = process.env.NODE_ENV === 'development';

/**
 * Create a timestamped logger with a prefix.
 * Only logs in development mode.
 */
export function createLogger(prefix: string) {
  return function logWithTime(message: string, data?: Record<string, unknown>) {
    if (isDev) {
      const timestamp = new Date().toISOString();
      console.log(`[${prefix} ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
    }
  };
}
