/**
 * @fileoverview Service-root observability profile for HQ Ops.
 *
 * @remarks
 * `src/service/impl.ts` attaches this middleware once through native
 * `impl.use(...)`. It enriches service spans, logs, and lifecycle events with
 * the stable HQ Ops scope and invocation identity.
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
