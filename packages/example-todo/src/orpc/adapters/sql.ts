/**
 * @fileoverview Canonical SQL execution contracts used by the example package.
 *
 * @remarks
 * `DbPool` is the host-provided prerequisite. `Sql` is the execution capability
 * exposed to handlers after the SQL provider middleware runs.
 */

export interface Sql {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
}

export interface DbPool {
  connect(): Sql | Promise<Sql>;
}
