/**
 * Tiny structured logger for server-side code. Keeps a consistent,
 * greppable prefix and never throws.
 */
function fmt(scope: string, level: string, message: string, extra?: unknown): string {
  const base = `[jp-bench][${scope}][${level}] ${message}`;
  return base + (extra !== undefined ? "" : "");
}

export const logger = {
  info(scope: string, message: string, extra?: unknown) {
    if (extra !== undefined) console.log(fmt(scope, "INFO", message), extra);
    else console.log(fmt(scope, "INFO", message));
  },
  warn(scope: string, message: string, extra?: unknown) {
    if (extra !== undefined) console.warn(fmt(scope, "WARN", message), extra);
    else console.warn(fmt(scope, "WARN", message));
  },
  error(scope: string, message: string, extra?: unknown) {
    if (extra !== undefined) console.error(fmt(scope, "ERROR", message), extra);
    else console.error(fmt(scope, "ERROR", message));
  },
};
