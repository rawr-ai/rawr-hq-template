/**
 * @fileoverview Required service-wide analytics middleware.
 *
 * @remarks
 * A service-global payload contributor to the one canonical analytics emission
 * path. It does not create a second emitter.
 */
import { createRequiredServiceAnalyticsMiddleware } from "../base";

/** The one required service-wide analytics payload contributor. */
export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_ledger_name: context.scope.ledgerName,
    analytics_trace_id: context.invocation.traceId,
    analytics_read_only: context.config.readOnly,
  }),
});
