import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Logger } from "../../orpc/base";
import { createServiceMiddleware } from "../base";
import type { ServiceMetadata } from "../base";

type ServiceProcedureMeta = ServiceMetadata;

type ErrorShape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

function getProcedureMeta(procedure: unknown): ServiceProcedureMeta {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: ServiceProcedureMeta } };
  return anyProcedure?.["~orpc"]?.meta ?? { idempotent: true };
}

function getErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const typed = error as ErrorShape;
  return {
    code: typeof typed.code === "string" ? typed.code : undefined,
    status: typeof typed.status === "number" ? typed.status : undefined,
    errorName: typeof typed.name === "string" ? typed.name : undefined,
    errorMessage: typeof typed.message === "string" ? typed.message : undefined,
  };
}

export const todoObservability = createServiceMiddleware<{
  deps: {
    logger: Logger;
  };
  scope: {
    workspaceId: string;
  };
  config: {
    readOnly: boolean;
  };
  invocation: {
    traceId: string;
  };
}>().middleware(async ({ context, path, procedure, next }) => {
  const span = trace.getActiveSpan();
  const meta = getProcedureMeta(procedure);
  const pathLabel = path.join(".");
  const startedAt = Date.now();
  const spanTraceId = span?.spanContext().traceId;
  const entity = meta.entity ?? (path[0]?.endsWith("s") ? path[0].slice(0, -1) : path[0]);

  span?.setAttributes({
    "rawr.todo.workspace_id": context.scope.workspaceId,
    "rawr.todo.read_only": context.config.readOnly,
    "rawr.todo.invocation_trace_id": context.invocation.traceId,
    ...(entity ? { "rawr.todo.entity": entity } : {}),
    ...(meta.audit ? { "rawr.todo.audit": meta.audit } : {}),
  });
  span?.addEvent("todo.procedure.started", {
    path: pathLabel,
    workspaceId: context.scope.workspaceId,
    traceId: context.invocation.traceId,
  });

  try {
    const result = await next();

    span?.addEvent("todo.procedure.succeeded", {
      path: pathLabel,
      durationMs: Date.now() - startedAt,
      workspaceId: context.scope.workspaceId,
    });

    context.deps.logger.info("todo.procedure", {
      outcome: "success",
      path: pathLabel,
      durationMs: Date.now() - startedAt,
      spanTraceId,
      invocationTraceId: context.invocation.traceId,
      workspaceId: context.scope.workspaceId,
      entity,
      audit: meta.audit,
      readOnly: context.config.readOnly,
    });

    return result;
  }
  catch (error) {
    const details = getErrorDetails(error);

    span?.recordException(error instanceof Error ? error : new Error(String(details.errorMessage ?? "todo procedure failed")));
    span?.setStatus({
      code: SpanStatusCode.ERROR,
      message: typeof details.errorMessage === "string" ? details.errorMessage : "todo procedure failed",
    });
    span?.addEvent("todo.procedure.failed", {
      path: pathLabel,
      durationMs: Date.now() - startedAt,
      workspaceId: context.scope.workspaceId,
      ...(details.code ? { code: details.code } : {}),
      ...(typeof details.status === "number" ? { status: details.status } : {}),
    });

    if (details.code === "READ_ONLY_MODE") {
      span?.addEvent("todo.policy.read_only_rejected", {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }

    if (details.code === "ASSIGNMENT_LIMIT_REACHED") {
      span?.addEvent("todo.policy.assignment_limit_reached", {
        path: pathLabel,
        workspaceId: context.scope.workspaceId,
      });
    }

    context.deps.logger.error("todo.procedure", {
      outcome: "error",
      path: pathLabel,
      durationMs: Date.now() - startedAt,
      spanTraceId,
      invocationTraceId: context.invocation.traceId,
      workspaceId: context.scope.workspaceId,
      entity,
      audit: meta.audit,
      readOnly: context.config.readOnly,
      ...details,
    });

    throw error;
  }
});
