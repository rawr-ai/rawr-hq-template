import {
  defineServiceObservabilityProfile,
  type BasePolicyProfile,
} from "../../orpc-sdk";
import type { ServiceContext, ServiceMetadata } from "./types";

/**
 * Baseline service observability profile for the todo package.
 *
 * @remarks
 * Keep service-specific observability deltas and bounded hooks here instead of
 * re-authoring a full middleware shell in `src/service/impl.ts`.
 * Module/procedure-local additions belong in module `setup.ts` and `router.ts`
 * via `createServiceObservabilityMiddleware(...)`.
 *
 * The SDK derives the repetitive baseline from service metadata:
 * - logger event names like `todo.procedure`
 * - lifecycle event names like `todo.procedure.started`
 * - attribute prefixes like `rawr.todo.*`
 *
 * This file should only declare what is specific to the todo service.
 */
export const observability = defineServiceObservabilityProfile<
  ServiceMetadata,
  ServiceContext,
  BasePolicyProfile
>({
  attributes: ({ context, meta, path }) => {
    return {
      workspace_id: context.scope.workspaceId,
      read_only: context.config.readOnly,
      invocation_trace_id: context.invocation.traceId,
    };
  },
  logFields: ({ context, spanTraceId }) => {
    return {
      spanTraceId,
      invocationTraceId: context.invocation.traceId,
      workspaceId: context.scope.workspaceId,
      readOnly: context.config.readOnly,
    };
  },
  startedEventFields: ({ context }) => {
    return {
      workspaceId: context.scope.workspaceId,
      traceId: context.invocation.traceId,
    };
  },
  succeededEventFields: ({ context }) => {
    return {
      workspaceId: context.scope.workspaceId,
    };
  },
  onFailed: ({ span, context, pathLabel, error, policyEvents }) => {
    if (error.code === "READ_ONLY_MODE" && policyEvents?.readOnlyRejected) {
      span?.addEvent(policyEvents.readOnlyRejected, {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }

    if (error.code === "ASSIGNMENT_LIMIT_REACHED" && policyEvents?.assignmentLimitReached) {
      span?.addEvent(policyEvents.assignmentLimitReached, {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }
  },
});
