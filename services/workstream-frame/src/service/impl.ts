/**
 * @fileoverview Central oRPC implementer for the workstream-frame package.
 *
 * @remarks
 * The single package-wide middleware composition point. Required service
 * observability and analytics extensions are supplied here exactly once.
 *
 * @agents
 * Module- and procedure-local middleware belongs in module `module.ts` and
 * `router.ts` files, not here.
 */
import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics.middleware";
import { observability } from "./middleware/observability.middleware";

/** Central implementer tree modules derive their subtrees from. */
export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
});
