import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { BaseMetadata, Logger } from "../base";
import { createBaseMiddleware } from "../base-foundation";

type ErrorShape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

function getProcedureMeta(procedure: unknown): BaseMetadata {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: BaseMetadata } };
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

export function createBaseObservabilityMiddleware() {
  return createBaseMiddleware<{
    deps: {
      logger: Logger;
    };
  }>().middleware(async ({ context, path, procedure, next }) => {
    const span = trace.getActiveSpan();
    const startedAt = Date.now();
    const meta = getProcedureMeta(procedure);
    const pathLabel = path.join(".");
    const spanTraceId = span?.spanContext().traceId;

    span?.setAttributes({
      "rawr.orpc.path": pathLabel,
      "rawr.orpc.idempotent": meta.idempotent,
      ...(meta.domain ? { "rawr.orpc.domain": meta.domain } : {}),
      ...(meta.audience ? { "rawr.orpc.audience": meta.audience } : {}),
    });
    span?.addEvent("rawr.orpc.procedure.started", {
      path: pathLabel,
      idempotent: meta.idempotent,
    });

    try {
      const result = await next();

      span?.addEvent("rawr.orpc.procedure.succeeded", {
        path: pathLabel,
        durationMs: Date.now() - startedAt,
      });

      context.deps.logger.info("orpc.procedure", {
        outcome: "success",
        path: pathLabel,
        durationMs: Date.now() - startedAt,
        spanTraceId,
        domain: meta.domain,
        audience: meta.audience,
        idempotent: meta.idempotent,
      });

      return result;
    }
    catch (error) {
      const details = getErrorDetails(error);

      span?.recordException(error instanceof Error ? error : new Error(String(details.errorMessage ?? "orpc procedure failed")));
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: typeof details.errorMessage === "string" ? details.errorMessage : "procedure failed",
      });
      span?.addEvent("rawr.orpc.procedure.failed", {
        path: pathLabel,
        durationMs: Date.now() - startedAt,
        ...(details.code ? { code: details.code } : {}),
        ...(typeof details.status === "number" ? { status: details.status } : {}),
      });

      context.deps.logger.error("orpc.procedure", {
        outcome: "error",
        path: pathLabel,
        durationMs: Date.now() - startedAt,
        spanTraceId,
        domain: meta.domain,
        audience: meta.audience,
        idempotent: meta.idempotent,
        ...details,
      });

      throw error;
    }
  });
}
