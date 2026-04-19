/**
 * @fileoverview Security module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 * - `repository`
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import { UnexpectedInternalError } from "../../shared/internal-errors";
import type { SecurityRuntime } from "../../shared/ports/security-runtime";
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
  deps: {
    securityRuntime?: SecurityRuntime;
  };
  scope: {
    repoRoot: string;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  const securityRuntime = context.deps.securityRuntime;
  if (!securityRuntime) {
    throw new UnexpectedInternalError("HQ Ops securityRuntime host runtime is not installed.");
  }

  return next({
    repo: createRepository(securityRuntime, context.scope.repoRoot),
  });
});
