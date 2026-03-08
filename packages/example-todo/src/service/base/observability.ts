import type { ServiceObservabilityProfile } from "../../orpc-sdk";
import type { ServiceContext, ServiceMetadata } from "./types";

function inferEntity(segment?: string) {
  if (!segment) {
    return undefined;
  }

  return segment.endsWith("s") ? segment.slice(0, -1) : segment;
}

/**
 * Baseline service observability profile for the todo package.
 *
 * @remarks
 * Keep service-specific observability deltas and bounded hooks here instead of
 * re-authoring a full middleware shell in `src/service/impl.ts`.
 *
 * The SDK derives the repetitive baseline from service metadata:
 * - logger event names like `todo.procedure`
 * - lifecycle event names like `todo.procedure.started`
 * - attribute prefixes like `rawr.todo.*`
 *
 * This file should only declare what is specific to the todo service.
 */
export const observability: ServiceObservabilityProfile<ServiceMetadata, ServiceContext> = {
  attributes: ({ context, meta, path }) => {
    const entity = meta.entity ?? inferEntity(path[0]);

    return {
      workspace_id: context.scope.workspaceId,
      read_only: context.config.readOnly,
      invocation_trace_id: context.invocation.traceId,
      ...(entity ? { entity } : {}),
      ...(meta.audit ? { audit: meta.audit } : {}),
    };
  },
  logFields: ({ context, meta, path, spanTraceId }) => {
    const entity = meta.entity ?? inferEntity(path[0]);

    return {
      spanTraceId,
      invocationTraceId: context.invocation.traceId,
      workspaceId: context.scope.workspaceId,
      entity,
      audit: meta.audit,
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
};
