import type { Attributes, Span } from "@opentelemetry/api";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { MiddlewareResult } from "@orpc/server";
import type { BaseMetadata, Logger } from "../base";
import { createBaseMiddleware } from "../base-foundation";
import { createNormalMiddlewareBuilder } from "../factory/middleware";

export type ObservabilityErrorDetails = ReturnType<typeof getErrorDetails>;

export type BaseObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicy extends {
    events?: Record<string, string | undefined>;
  } = {
    events?: Record<string, string | undefined>;
  },
> = {
  loggerEvent: string;
  startedEvent: string;
  succeededEvent: string;
  failedEvent: string;
  getAttributes(args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
  }): Attributes;
  getLogFields(args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
    spanTraceId?: string;
  }): Record<string, unknown>;
  onStarted?(args: {
    span: Span | undefined;
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
  }): void;
  onSucceeded?(args: {
    span: Span | undefined;
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
  }): void;
  onFailed?(args: {
    span: Span | undefined;
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
    error: ObservabilityErrorDetails;
    policy: TPolicy;
  }): void;
};

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

function createObservabilityHandler<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicy extends {
    events?: Record<string, string | undefined>;
  },
>(options: {
  getMeta(procedure: unknown): TMeta;
  profile: BaseObservabilityProfile<TMeta, TContext, TPolicy>;
  policy: TPolicy;
}) {
  return async ({
    context,
    path,
    procedure,
    next,
  }: {
    context: TContext;
    path: readonly string[];
    procedure: unknown;
    next: () => MiddlewareResult<Record<never, never>, unknown>;
  }) => {
    const span = trace.getActiveSpan();
    const startedAt = Date.now();
    const meta = options.getMeta(procedure);
    const pathLabel = path.join(".");
    const spanTraceId = span?.spanContext().traceId;

    span?.setAttributes(options.profile.getAttributes({
      context,
      meta,
      path,
      pathLabel,
    }));
    span?.addEvent(options.profile.startedEvent, { path: pathLabel });
    options.profile.onStarted?.({
      span,
      context,
      meta,
      path,
      pathLabel,
    });

    try {
      const result = await next();
      const durationMs = Date.now() - startedAt;

      span?.addEvent(options.profile.succeededEvent, {
        path: pathLabel,
        durationMs,
      });
      options.profile.onSucceeded?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs,
      });

      context.deps.logger.info(options.profile.loggerEvent, {
        outcome: "success",
        path: pathLabel,
        durationMs,
        ...options.profile.getLogFields({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          spanTraceId,
        }),
      });

      return result;
    }
    catch (error) {
      const durationMs = Date.now() - startedAt;
      const details = getErrorDetails(error);

      span?.recordException(error instanceof Error ? error : new Error(String(details.errorMessage ?? "procedure failed")));
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: typeof details.errorMessage === "string" ? details.errorMessage : "procedure failed",
      });
      span?.addEvent(options.profile.failedEvent, {
        path: pathLabel,
        durationMs,
        ...(details.code ? { code: details.code } : {}),
        ...(typeof details.status === "number" ? { status: details.status } : {}),
      });
      options.profile.onFailed?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs,
        error: details,
        policy: options.policy,
      });

      context.deps.logger.error(options.profile.loggerEvent, {
        outcome: "error",
        path: pathLabel,
        durationMs,
        ...options.profile.getLogFields({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          spanTraceId,
        }),
        ...details,
      });

      throw error;
    }
  };
}

export function createBaseObservabilityMiddleware() {
  const profile: BaseObservabilityProfile<
    BaseMetadata,
    {
      deps: {
        logger: Logger;
      };
    }
  > = {
    loggerEvent: "orpc.procedure",
    startedEvent: "rawr.orpc.procedure.started",
    succeededEvent: "rawr.orpc.procedure.succeeded",
    failedEvent: "rawr.orpc.procedure.failed",
    getAttributes: ({ meta, pathLabel }) => ({
      "rawr.orpc.path": pathLabel,
      "rawr.orpc.idempotent": meta.idempotent,
      ...(meta.domain ? { "rawr.orpc.domain": meta.domain } : {}),
      ...(meta.audience ? { "rawr.orpc.audience": meta.audience } : {}),
    }),
    getLogFields: ({ meta, durationMs, pathLabel, spanTraceId }) => ({
      path: pathLabel,
      durationMs,
      spanTraceId,
      domain: meta.domain,
      audience: meta.audience,
      idempotent: meta.idempotent,
    }),
  };

  return createBaseMiddleware<{
    deps: {
      logger: Logger;
    };
  }>().middleware(createObservabilityHandler({
    getMeta: getProcedureMeta,
    profile,
    policy: {},
  }));
}

export function createServiceObservabilityMiddleware<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicy extends {
    events?: Record<string, string | undefined>;
  },
>(
  baseMetadata: TMeta,
  profile: BaseObservabilityProfile<TMeta, TContext, TPolicy>,
  policy: TPolicy,
) {
  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(createObservabilityHandler({
    getMeta(procedure: unknown) {
      const anyProcedure = procedure as { ["~orpc"]?: { meta?: TMeta } };
      return anyProcedure?.["~orpc"]?.meta ?? baseMetadata;
    },
    profile,
    policy,
  }));
}
