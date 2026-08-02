/**
 * @fileoverview Service-root observability profile for HQ Ops.
 *
 * @remarks
 * `src/service/impl.ts` attaches this middleware once through native
 * `impl.use(...)`. It enriches service spans, logs, and lifecycle events with
 * the stable HQ Ops scope and invocation identity.
 */
import { createObservabilityMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../model/policy/procedure-metadata";

/** Authors repository lifecycle signals through the HQ Ops service context. */
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
