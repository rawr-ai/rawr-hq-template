/**
 * @fileoverview Required service-wide analytics middleware.
 *
 * @remarks
 * This file is a required service middleware extension. It is supplied to
 * `createServiceImplementer(...)` in `src/service/impl.ts` and enriches the
 * canonical SDK-owned analytics emission path with the reserved HQ Ops shell
 * metadata.
 */
import { createRequiredServiceAnalyticsMiddleware } from "../base";

export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
