/**
 * @fileoverview SQL provider.
 *
 * @remarks
 * Input-requiring provider:
 * - the host provides `deps.dbPool`
 * - middleware derives a downstream `sql` execution capability
 * - handlers and module setup consume `context.sql`, not `context.deps.dbPool`
 */

import type { DbPool } from "../adapters/sql";
import { createBaseMiddleware } from "../base-foundation";

/**
 * Zero-config SQL provider.
 *
 * @remarks
 * Export this as a ready-to-use middleware value. It consumes a host-owned
 * prerequisite (`deps.dbPool`) and provides the execution capability (`sql`).
 */
export const sqlProvider = createBaseMiddleware<{
  deps: {
    dbPool: DbPool;
  };
}>().middleware(async ({ context, next }) => {
  const sql = await context.deps.dbPool.connect();

  return next({
    context: {
      sql,
    },
  });
});
