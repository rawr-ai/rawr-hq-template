/**
 * @fileoverview Required service-wide analytics middleware.
 *
 * @remarks
 * This file is a required service middleware extension, specifically the
 * contributor-style example.
 *
 * It is supplied to `createServiceImplementer(...)` in `src/service/impl.ts`
 * and enriches the canonical SDK-owned analytics emission path. Unlike the
 * observability example, it demonstrates a required service-global payload
 * contributor rather than a richer lifecycle wrapper.
 *
 * @agents
 * Put service-global analytics behavior here. Do not move analytics runtime
 * logic back into `service/base.ts`, and do not create a second service-wide
 * analytics emitter.
 */
import { createRequiredServiceAnalyticsMiddleware } from "../base";

export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
    analytics_read_only: context.config.readOnly,
  }),
});
