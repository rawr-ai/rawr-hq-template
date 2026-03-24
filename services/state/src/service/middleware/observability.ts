import { createRequiredServiceObservabilityMiddleware } from "../base";

export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    repoRoot: context.scope.repoRoot,
    invocationTraceId: context.invocation.traceId,
    spanTraceId,
  }),
  startEventAttributes: ({ context }) => ({
    repoRoot: context.scope.repoRoot,
    traceId: context.invocation.traceId,
  }),
  successEventAttributes: ({ context }) => ({
    repoRoot: context.scope.repoRoot,
  }),
});
