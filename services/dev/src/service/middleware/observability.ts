import { createRequiredServiceObservabilityMiddleware } from "../base";

export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    workspace_root: context.scope.workspaceRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
    workspaceRoot: context.scope.workspaceRoot,
  }),
  startEventAttributes: ({ context }) => ({
    workspaceRoot: context.scope.workspaceRoot,
    traceId: context.invocation.traceId,
  }),
  successEventAttributes: ({ context }) => ({
    workspaceRoot: context.scope.workspaceRoot,
  }),
});
