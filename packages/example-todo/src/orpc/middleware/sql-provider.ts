/**
 * @fileoverview SQL provider.
 *
 * @remarks
 * Input-requiring provider:
 * - the host provides `deps.dbPool`
 * - middleware derives a downstream `provided.sql` execution capability
 * - module setup can then create domain-local top-level execution keys such as
 *   `repo` from `context.provided.sql`
 */

import type { DbPool, Sql } from "../adapters/sql";
import { createBaseProvider } from "../base-foundation";

/**
 * Zero-config SQL provider.
 *
 * @remarks
 * Export this as a ready-to-use middleware value. It consumes a host-owned
 * prerequisite (`deps.dbPool`) and provides the execution capability under the
 * shared `provided` bucket.
 */
export const sqlProvider = createBaseProvider<{
  deps: {
    dbPool: DbPool;
  };
}>().middleware<{
  sql: Sql;
}>(async ({ context, next }) => {
  const sql = await context.deps.dbPool.connect();

  return next({
    sql,
  });
});
