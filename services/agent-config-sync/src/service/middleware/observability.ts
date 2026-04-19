/**
 * @fileoverview Required service-wide observability middleware.
 */
import { createRequiredServiceObservabilityMiddleware } from "../base";

export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
    repoRoot: context.scope.repoRoot,
  }),
  startEventAttributes: ({ context }) => ({
    repoRoot: context.scope.repoRoot,
    traceId: context.invocation.traceId,
  }),
  successEventAttributes: ({ context }) => ({
    repoRoot: context.scope.repoRoot,
  }),
});
