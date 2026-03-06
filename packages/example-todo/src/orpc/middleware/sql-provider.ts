/**
 * @fileoverview SQL provider middleware.
 *
 * @remarks
 * This is an input-requiring provider:
 * - the host must provide `deps.dbPool`,
 * - middleware derives a top-level `sql` execution capability,
 * - handlers and module setup consume `context.sql`, not `context.deps.dbPool`.
 */

import type { DbPool, Sql } from "../adapters/sql";
import { createBaseMiddleware } from "../factory";

export const sqlProvider = createBaseMiddleware<{
  deps: {
    dbPool: DbPool;
  };
}>().middleware(async ({ context, next }) => {
  const sql = await context.deps.dbPool.connect();

  return next({
    context: {
      sql,
    } satisfies {
      sql: Sql;
    },
  });
});
