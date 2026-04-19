/**
 * @fileoverview Central oRPC implementer for the HQ Ops package.
 *
 * @remarks
 * This is the single package-wide middleware composition point.
 * Import the root contract here, derive the central implementer once, and let
 * modules consume `impl.<module>` subtrees from there.
 *
 * @agents
 * This file is the only package-wide runtime assembly seam. Required service
 * observability semantics are supplied here exactly once.
 */
import { contract } from "./contract";
import { createServiceImplementer } from "./base";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) framework baseline middleware from the SDK seam
 * 2) required service middleware extensions supplied here and auto-attached
 *    inside `createServiceImplementer(...)`
 *
 * U02 is reservation-only, so no extra service-wide providers or guards are
 * attached yet.
 */
export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
});
