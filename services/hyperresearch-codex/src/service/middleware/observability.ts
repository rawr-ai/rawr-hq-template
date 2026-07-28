/**
 * @fileoverview Required service-wide observability middleware.
 */
import { createObservabilityMiddlewareCallback } from "@rawr/hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../contract";

/** Authors run lifecycle signals through the Hyperresearch service context. */
export const middleware = base.middleware(
  createObservabilityMiddlewareCallback(metadataDefaults, {
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
  })
);
