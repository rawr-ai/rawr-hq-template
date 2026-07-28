/**
 * @fileoverview Service-root analytics profile for HQ Ops.
 *
 * @remarks
 * `src/service/impl.ts` attaches this middleware once through native
 * `impl.use(...)`. It enriches the service analytics event with the HQ Ops
 * repository scope and invocation identity.
 */
import { createAnalyticsMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../contract";

export const analytics = createAnalyticsMiddleware<Context>(metadataDefaults, {
  payload: ({ context }) => ({
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
