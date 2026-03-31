/**
 * @fileoverview Required service-wide observability middleware.
 *
 * @remarks
 * This file is the canonical required service middleware extension for the HQ
 * Ops package. It is supplied to `createServiceImplementer(...)` in
 * `src/service/impl.ts` and enriches service-global observability with the
 * reserved stable scope and invocation lanes.
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
