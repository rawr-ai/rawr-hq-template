/**
 * @fileoverview Runtime dependency contracts (ports) for this domain package.
 *
 * @remarks
 * Domain logic depends on interfaces (`Sql`, `Logger`, `Clock`) rather than
 * concrete adapters. Keep these contracts small and capability-oriented.
 *
 * Trap to avoid: adding transport concerns (HTTP request/response types) here.
 * This package is transport-agnostic by design.
 *
 * @agents
 * Extend these interfaces only when multiple procedures need the new capability.
 * For one-off logic, prefer module-local composition over global dependency growth.
 */
export interface Sql {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface Clock {
  now(): string;
}

export interface Deps {
  sql: Sql;
  logger: Logger;
  clock: Clock;
}
