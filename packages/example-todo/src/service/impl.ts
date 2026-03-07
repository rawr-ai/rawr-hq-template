/**
 * @fileoverview Central oRPC implementer for the todo domain package.
 *
 * @remarks
 * This is the single package-wide middleware composition point.
 * Import the root contract here, derive the central implementer once, and let
 * modules consume `impl.<module>` subtrees from there.
 */
import { contract } from "./contract";
import { createServiceImplementer } from "./base";
import { invocationTrace } from "./middleware/invocation-trace";
import { readOnlyMode } from "./middleware/read-only-mode";
import { sqlProvider } from "../orpc-sdk";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) baseline observability middleware (inside `createServiceImplementer`)
 * 2) invocation observer (`invocation.traceId`)
 * 3) SQL provider (`deps.dbPool` -> `provided.sql`)
 * 4) domain guard (`readOnlyMode`)
 */
export const impl = createServiceImplementer(contract)
  .use(invocationTrace)
  .use(sqlProvider)
  .use(readOnlyMode);
