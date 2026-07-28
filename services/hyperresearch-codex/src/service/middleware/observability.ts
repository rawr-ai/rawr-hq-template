/**
 * @fileoverview Required service-wide observability middleware.
 */
import { createObservabilityMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../contract";

export const observability = createObservabilityMiddleware<Context>(metadataDefaults, {
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
