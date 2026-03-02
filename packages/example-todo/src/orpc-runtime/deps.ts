/**
 * @fileoverview Runtime dependency contracts (ports) for this domain package.
 *
 * @remarks
 * Domain logic depends on interfaces (`Sql`, `Clock`) rather than concrete
 * adapters. `logger` is inherited from the shared `BaseDeps` contract in
 * `@rawr/orpc-standards`.
 *
 * Trap to avoid: adding transport concerns (HTTP request/response types) here.
 * This package is transport-agnostic by design.
 *
 * @agents
 * Extend these interfaces only when multiple procedures need the new capability.
 * For one-off logic, prefer module-local composition over global dependency growth.
 */
import type { BaseDeps, Logger } from "@rawr/orpc-standards";

export interface Sql {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
}

export interface Clock {
  now(): string;
}

export interface Deps extends BaseDeps {
  sql: Sql;
  clock: Clock;
}

export type { Logger };
