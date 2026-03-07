/**
 * Canonical logger contract shared by internal domain packages.
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Minimum dependency contract expected by domain packages.
 *
 * Packages can extend this with domain-specific capabilities (for example `sql`,
 * `clock`, external service adapters).
 */
export interface BaseDeps {
  logger: Logger;
}
