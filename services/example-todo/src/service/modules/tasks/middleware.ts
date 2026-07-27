/**
 * @fileoverview Task module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 *
 * This module currently has no standalone additive observability or analytics
 * behavior, so those exports are intentional no-op additive middleware
 * placeholders. `example-todo` keeps them anyway so every module exposes the
 * same generic middleware surface through `middleware.ts`.
 */

import { createServiceAnalyticsMiddleware, createServiceObservabilityMiddleware } from "../../base";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/** Intentional scaffold placeholder for the module's generic observability export. */
export const observability = createServiceObservabilityMiddleware({});

/** Intentional scaffold placeholder for the module's generic analytics export. */
export const analytics = createServiceAnalyticsMiddleware({});
