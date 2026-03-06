import { implement } from "@orpc/server";

import type { DbPool } from "../src/orpc/adapters/sql";
import { sqlProvider } from "../src/orpc/middleware/sql-provider";
import { contract } from "../src/service/contract";

declare const dbPool: DbPool;

// Missing nested dependency fragment should fail at `.use(...)`.
// @ts-expect-error dbPool is required by the SQL provider.
const missingSqlDeps = implement(contract).$context<{ deps: {} }>().use(sqlProvider);
void missingSqlDeps;

// Exact match should pass.
const exactSqlDeps = implement(contract)
  .$context<{ deps: { dbPool: DbPool } }>()
  .use(sqlProvider);
void exactSqlDeps;

// Structural superset should also pass.
const extendedSqlDeps = implement(contract)
  .$context<{ deps: { dbPool: DbPool; requestId: string; featureFlag: boolean } }>()
  .use(sqlProvider);
void extendedSqlDeps;
void dbPool;
