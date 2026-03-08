import type { BaseObservabilityProfile } from "../../orpc-sdk";
import type { ServiceContext, ServiceMetadata } from "./index";

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
 * Keep service-specific observability semantics here instead of re-authoring a
 * full middleware shell in `src/service/impl.ts`.
 */
export const observability: BaseObservabilityProfile<ServiceMetadata, ServiceContext> = {
  loggerEvent: "todo.procedure",
  startedEvent: "todo.procedure.started",
  succeededEvent: "todo.procedure.succeeded",
  failedEvent: "todo.procedure.failed",
  getAttributes: ({ context, meta, path }) => {
    const entity = meta.entity ?? inferEntity(path[0]);

    return {
      "rawr.todo.workspace_id": context.scope.workspaceId,
      "rawr.todo.read_only": context.config.readOnly,
      "rawr.todo.invocation_trace_id": context.invocation.traceId,
      ...(entity ? { "rawr.todo.entity": entity } : {}),
      ...(meta.audit ? { "rawr.todo.audit": meta.audit } : {}),
    };
  },
  getLogFields: ({ context, meta, path, spanTraceId }) => {
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
  onStarted: ({ span, context, pathLabel }) => {
    span?.addEvent("todo.procedure.started", {
      path: pathLabel,
      workspaceId: context.scope.workspaceId,
      traceId: context.invocation.traceId,
    });
  },
  onSucceeded: ({ span, context, pathLabel, durationMs }) => {
    span?.addEvent("todo.procedure.succeeded", {
      path: pathLabel,
      durationMs,
      workspaceId: context.scope.workspaceId,
    });
  },
  onFailed: ({ span, context, pathLabel, error, policy }) => {
    if (error.code === "READ_ONLY_MODE" && policy.events?.readOnlyRejected) {
      span?.addEvent(policy.events.readOnlyRejected, {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }

    if (error.code === "ASSIGNMENT_LIMIT_REACHED" && policy.events?.assignmentLimitReached) {
      span?.addEvent(policy.events.assignmentLimitReached, {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }
  },
};
