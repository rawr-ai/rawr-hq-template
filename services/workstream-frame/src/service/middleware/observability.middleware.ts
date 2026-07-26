/**
 * @fileoverview Required service-wide observability middleware.
 *
 * @remarks
 * Supplied to `createServiceImplementer(...)` in `src/service/impl.ts`. It adds
 * the service-global runtime observability behaviour the SDK baseline cannot
 * infer, including policy-aware handling of read-only rejections.
 *
 * @agents
 * Must not depend on `provided.*` — required service middleware runs before
 * provider-added execution resources exist.
 */
import { createRequiredServiceObservabilityMiddleware, policy } from "../base";

/** The one required service-wide observability wrapper. */
export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    ledger_name: context.scope.ledgerName,
    read_only: context.config.readOnly,
    invocation_trace_id: context.invocation.traceId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
    ledgerName: context.scope.ledgerName,
    readOnly: context.config.readOnly,
  }),
  startEventAttributes: ({ context }) => ({
    ledgerName: context.scope.ledgerName,
    traceId: context.invocation.traceId,
  }),
  successEventAttributes: ({ context }) => ({
    ledgerName: context.scope.ledgerName,
  }),
  onError: ({ span, context, pathLabel, error, policyEvents }) => {
    const readOnlyRejected = policyEvents?.readOnlyRejected ?? policy.events.readOnlyRejected;
    if (error.code === "READ_ONLY_MODE" && readOnlyRejected) {
      span?.addEvent(readOnlyRejected, {
        path: pathLabel,
        ledgerName: context.scope.ledgerName,
      });
    }
  },
});
