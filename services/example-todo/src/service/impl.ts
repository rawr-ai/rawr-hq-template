/**
 * @fileoverview Central oRPC implementer for the todo domain package.
 *
 * @remarks
 * This is the single package-wide middleware composition point.
 * Import the root contract here, derive the central implementer once, and let
 * modules consume `service.<module>` subtrees from there.
 *
 * @agents
 * This file is the only package-wide runtime assembly seam. Required service
 * observability semantics are supplied here exactly once; extra providers and guards are
 * layered here after that.
 */

import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics.middleware";
import { observability } from "./middleware/observability.middleware";
import { readOnlyMode } from "./middleware/read-only-mode.middleware";
import { stores } from "./middleware/stores.middleware";

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
 * Do not attach additive observability middleware here to satisfy the required
 * service middleware extension slots. Module/procedure-local additive
 * middleware belongs in module `module.ts` and `router.ts` files.
 */
export const service = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(stores)
  .use(readOnlyMode);
