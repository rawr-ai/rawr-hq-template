/**
 * @fileoverview Central oRPC implementer for the todo domain package.
 *
 * @remarks
 * This file is the single service middleware composition point:
 * - import the root contract (contract bubble-up),
 * - derive the central implementer once,
 * - attach package-wide middleware here (providers, guards),
 * - export the implementer tree for modules to derive from (`impl.<module>`).
 *
 * The service router (`service/router.ts`) should only compose module routers and
 * call `.router(...)` once (no `.use(...)` there).
 */
import { contract } from "./contract";
import { createServiceImplementer } from "./base";
import { readOnlyMode } from "./middleware/read-only-mode";
import { sqlProvider } from "../orpc-sdk";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) baseline observability middleware (inside `createServiceImplementer`)
 * 2) SQL provider (`deps.dbPool` -> `sql`)
 * 3) domain guard (`readOnlyMode`)
 */
export const impl = createServiceImplementer(contract)
  .use(sqlProvider)
  .use(readOnlyMode);
