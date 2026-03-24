/**
 * @fileoverview State module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 * - `repository`
 *
 * The state module currently has no standalone additive observability or
 * analytics behavior, so those exports are intentional no-op placeholders.
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import { createRepository } from "./repository";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/** Intentional scaffold placeholder for the module's generic observability export. */
export const observability = createServiceObservabilityMiddleware({});

/** Intentional scaffold placeholder for the module's generic analytics export. */
export const analytics = createServiceAnalyticsMiddleware({});

/** Standalone repository provider attached at module scope in `module.ts`. */
export const repository = createServiceProvider<{
  scope: {
    repoRoot: string;
  };
}>().middleware<{
  repository: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repository: createRepository(context.scope.repoRoot),
  });
});
