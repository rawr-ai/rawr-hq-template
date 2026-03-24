/**
 * @fileoverview Canonical DB execution ports used by the example package.
 *
 * @remarks
 * `DbPool` is the host-provided prerequisite port. `Sql` is the execution port
 * exposed to handlers after the SQL provider middleware runs.
 *
 * Concrete host adapters such as Drizzle-backed implementations must satisfy
 * these ports.
 */

export interface Sql {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
}

export interface DbPool {
  connect(): Sql | Promise<Sql>;
}
