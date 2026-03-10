/**
 * @fileoverview Central oRPC implementer for the todo domain package.
 *
 * @remarks
 * This is the single package-wide middleware composition point.
 * Import the root contract here, derive the central implementer once, and let
 * modules consume `impl.<module>` subtrees from there.
 *
 * @agents
 * This file is the only package-wide runtime assembly seam. Required service
 * telemetry is supplied here exactly once; extra providers and guards are
 * layered here after that.
 */
import { contract } from "./contract";
import { createServiceImplementer } from "./base";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";
import { readOnlyMode } from "./middleware/read-only-mode";
import { sqlProvider } from "../orpc-sdk";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) framework baseline middleware from the SDK seam
 * 2) required service middleware extensions supplied here and auto-attached
 *    inside `createServiceImplementer(...)`
 * 3) extra service-wide providers/guards authored here
 *
 * Do not attach additive telemetry middleware here to satisfy the required
 * service middleware extension slots. Module/procedure-local additive
 * middleware belongs in module `setup.ts` and `router.ts` files.
 */
export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(sqlProvider)
  .use(readOnlyMode);
