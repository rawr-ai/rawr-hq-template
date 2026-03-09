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
import { readOnlyMode } from "./middleware/read-only-mode";
import { sqlProvider } from "../orpc-sdk";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) framework baseline middleware from the SDK seam
 * 2) service-wide baseline observability + analytics declared in `service/base/`
 * 3) extra service-wide providers/guards authored here
 *
 * Do not manually re-attach the default service-wide observability, analytics,
 * or policy middleware in this file. Module/procedure-local additive middleware
 * belongs in module `setup.ts` and `router.ts` files.
 */
export const impl = createServiceImplementer(contract)
  .use(sqlProvider)
  .use(readOnlyMode);
