/**
 * @fileoverview Required service-wide observability middleware.
 *
 * @remarks
 * This file is the canonical example of a required service middleware
 * extension.
 *
 * It is supplied to `createServiceImplementer(...)` in `src/service/impl.ts`
 * and runs on top of the SDK-owned framework observability wrapper. It exists
 * because the framework baseline cannot infer this service's global runtime
 * observability behavior on its own, especially policy-aware error handling.
 *
 * @agents
 * Put service-global observability behavior here to illustrate the required
 * service middleware extension pattern. Do not move runtime hooks back into
 * `service/base.ts`. If observability logic depends on `provided.*`, it does
 * not belong here and should move to lower-scope additive middleware instead.
 */
import { createRequiredServiceObservabilityMiddleware, policy } from "../base";

export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    workspace_id: context.scope.workspaceId,
    read_only: context.config.readOnly,
    invocation_trace_id: context.invocation.traceId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
    workspaceId: context.scope.workspaceId,
    readOnly: context.config.readOnly,
  }),
  startEventAttributes: ({ context }) => ({
    workspaceId: context.scope.workspaceId,
    traceId: context.invocation.traceId,
  }),
  successEventAttributes: ({ context }) => ({
    workspaceId: context.scope.workspaceId,
  }),
  onError: ({ span, context, pathLabel, error, policyEvents }) => {
    const readOnlyRejected = policyEvents?.readOnlyRejected ?? policy.events.readOnlyRejected;
    const assignmentLimitReached = policyEvents?.assignmentLimitReached ?? policy.events.assignmentLimitReached;

    if (error.code === "READ_ONLY_MODE" && readOnlyRejected) {
      span?.addEvent(readOnlyRejected, {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }

    if (error.code === "ASSIGNMENT_LIMIT_REACHED" && assignmentLimitReached) {
      span?.addEvent(assignmentLimitReached, {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }
  },
});
