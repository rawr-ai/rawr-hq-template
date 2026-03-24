/**
 * @fileoverview Public package surface for the coordination domain.
 *
 * @remarks
 * Keep this file thin and capability-first:
 * - package boundary wiring lives in `client.ts`
 * - canonical service composition lives in `router.ts` and `service/*`
 * - pure domain semantics may be re-exported here
 */
export { createClient, type Client } from "./client";
export { router, type Router } from "./router";
export * from "./types";
export { topologicalDeskOrder } from "./graph";
export {
  assertSafeCoordinationId,
  isSafeCoordinationId,
  normalizeCoordinationId,
} from "./ids";
export { validateWorkflow } from "./validation";
