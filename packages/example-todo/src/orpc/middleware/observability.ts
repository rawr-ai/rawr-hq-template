/**
 * @fileoverview Baseline observability middleware and service observability profile types.
 *
 * @remarks
 * The framework owns the generic middleware envelope and baseline naming.
 * Service packages only supply domain-specific deltas and bounded lifecycle
 * hooks on top of that baseline.
 */
import type { Attributes, Span } from "@opentelemetry/api";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { MiddlewareResult } from "@orpc/server";
import type {
  AnyService,
  BaseMetadata,
  Logger,
  ServiceContextFrom,
  ServiceMetadataFrom,
} from "../base";
import { createBaseMiddleware } from "../base-foundation";
import { createNormalMiddlewareBuilder } from "../factory/middleware";

type ObservabilityScalar = string | number | boolean;
type ObservabilityFields = Record<string, ObservabilityScalar | undefined>;

export type ObservabilityErrorDetails = ReturnType<typeof getErrorDetails>;

type ObservabilityBaseArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
};

type ObservabilityDurationArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = ObservabilityBaseArgs<TMeta, TContext> & {
  durationMs: number;
};

type ObservabilityFailedArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = ObservabilityDurationArgs<TMeta, TContext> & {
  error: ObservabilityErrorDetails;
};

type ResolvedObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicyEvents extends Record<string, string | undefined> | undefined = undefined,
> = {
  loggerEvent: string;
  startedEvent: string;
  succeededEvent: string;
  failedEvent: string;
  getAttributes(args: ObservabilityBaseArgs<TMeta, TContext>): Attributes;
  getLogFields(args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
    spanTraceId?: string;
  }): Record<string, unknown>;
  getStartedEventFields?(args: ObservabilityBaseArgs<TMeta, TContext>): Attributes;
  getSucceededEventFields?(args: ObservabilityDurationArgs<TMeta, TContext>): Attributes;
  getFailedEventFields?(args: ObservabilityFailedArgs<TMeta, TContext>): Attributes;
  onStarted?(args: {
    span: Span | undefined;
  } & ObservabilityBaseArgs<TMeta, TContext>): void;
  onSucceeded?(args: {
    span: Span | undefined;
  } & ObservabilityDurationArgs<TMeta, TContext>): void;
  onFailed?(args: {
    span: Span | undefined;
    policyEvents: TPolicyEvents;
  } & ObservabilityFailedArgs<TMeta, TContext>): void;
};

export type ServiceObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends object,
  TPolicy extends {
    events?: Record<string, string | undefined>;
  } = {
    events?: Record<string, string | undefined>;
  },
> = {
  attributes?: (args: ObservabilityBaseArgs<TMeta, TContext>) => ObservabilityFields;
  logFields?: (args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
    spanTraceId?: string;
  }) => Record<string, unknown>;
  startedEventFields?: (args: ObservabilityBaseArgs<TMeta, TContext>) => Attributes;
  succeededEventFields?: (args: ObservabilityDurationArgs<TMeta, TContext>) => Attributes;
  failedEventFields?: (args: ObservabilityFailedArgs<TMeta, TContext>) => Attributes;
  onStarted?(args: {
    span: Span | undefined;
  } & ObservabilityBaseArgs<TMeta, TContext>): void;
  onSucceeded?(args: {
    span: Span | undefined;
  } & ObservabilityDurationArgs<TMeta, TContext>): void;
  onFailed?(args: {
    span: Span | undefined;
    policyEvents: TPolicy["events"];
  } & ObservabilityFailedArgs<TMeta, TContext>): void;
};

export function defineServiceObservabilityProfile<
  TService extends AnyService,
  TPolicy extends {
    events?: Record<string, string | undefined>;
  } = {
    events?: Record<string, string | undefined>;
  },
>(
  profile: ServiceObservabilityProfile<
    ServiceMetadataFrom<TService>,
    ServiceContextFrom<TService>,
    TPolicy
  >,
) {
  return profile;
}

export type ServiceObservabilityMiddlewareInput<
  TMeta extends BaseMetadata,
  TContext extends object,
> = {
  attributes?: (args: ObservabilityBaseArgs<TMeta, TContext>) => ObservabilityFields;
  onStarted?(args: {
    span: Span | undefined;
  } & ObservabilityBaseArgs<TMeta, TContext>): void;
  onSucceeded?(args: {
    span: Span | undefined;
  } & ObservabilityDurationArgs<TMeta, TContext>): void;
  onFailed?(args: {
    span: Span | undefined;
  } & ObservabilityFailedArgs<TMeta, TContext>): void;
};

type ErrorShape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

function getProcedureMeta<TMeta extends BaseMetadata>(
  procedure: unknown,
  fallback: TMeta,
): TMeta {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: TMeta } };
  return anyProcedure?.["~orpc"]?.meta ?? fallback;
}

function getBaseProcedureMeta(procedure: unknown): BaseMetadata {
  return getProcedureMeta(procedure, { idempotent: true });
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

function toAttributes(fields: ObservabilityFields | undefined): Attributes {
  const attributes: Attributes = {};

  if (!fields) {
    return attributes;
  }

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attributes[key] = value;
    }
  }

  return attributes;
}

function prefixAttributes(prefix: string, fields: ObservabilityFields | undefined): Attributes {
  const attributes: Attributes = {};

  if (!fields) {
    return attributes;
  }

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attributes[`${prefix}.${key}`] = value;
    }
  }

  return attributes;
}

function deriveServiceNames(baseMetadata: BaseMetadata) {
  const domain = baseMetadata.domain ?? "service";

  return {
    domain,
    loggerEvent: `${domain}.procedure`,
    startedEvent: `${domain}.procedure.started`,
    succeededEvent: `${domain}.procedure.succeeded`,
    failedEvent: `${domain}.procedure.failed`,
    attributePrefix: `rawr.${domain}`,
  };
}

function inferEntity(segment?: string) {
  if (!segment) {
    return undefined;
  }

  return segment.endsWith("s") ? segment.slice(0, -1) : segment;
}

function getMetadataAudit(meta: BaseMetadata) {
  const candidate = (meta as BaseMetadata & { audit?: unknown }).audit;
  return typeof candidate === "string" ? candidate : undefined;
}

function getMetadataEntity(meta: BaseMetadata, path: readonly string[]) {
  const candidate = (meta as BaseMetadata & { entity?: unknown }).entity;
  return typeof candidate === "string" ? candidate : inferEntity(path[0]);
}

function resolveServiceObservabilityProfile<
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
  profile: ServiceObservabilityProfile<TMeta, TContext, TPolicy>,
): ResolvedObservabilityProfile<TMeta, TContext, TPolicy["events"]> {
  const names = deriveServiceNames(baseMetadata);

  return {
    loggerEvent: names.loggerEvent,
    startedEvent: names.startedEvent,
    succeededEvent: names.succeededEvent,
    failedEvent: names.failedEvent,
    getAttributes: ({ context, meta, path, pathLabel }) =>
      prefixAttributes(names.attributePrefix, {
        ...(getMetadataAudit(meta) ? { audit: getMetadataAudit(meta) } : {}),
        ...(getMetadataEntity(meta, path) ? { entity: getMetadataEntity(meta, path) } : {}),
        ...profile.attributes?.({
          context,
          meta,
          path,
          pathLabel,
        }),
      }),
    getLogFields: ({ context, meta, path, pathLabel, durationMs, spanTraceId }) =>
      ({
        ...(getMetadataEntity(meta, path) ? { entity: getMetadataEntity(meta, path) } : {}),
        ...(getMetadataAudit(meta) ? { audit: getMetadataAudit(meta) } : {}),
        ...(profile.logFields?.({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          spanTraceId,
        }) ?? {}),
      }),
    getStartedEventFields: profile.startedEventFields,
    getSucceededEventFields: profile.succeededEventFields,
    getFailedEventFields: profile.failedEventFields,
    onStarted: profile.onStarted,
    onSucceeded: profile.onSucceeded,
    onFailed: profile.onFailed,
  };
}

function createObservabilityHandler<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicyEvents extends Record<string, string | undefined> | undefined,
>(options: {
  getMeta(procedure: unknown): TMeta;
  profile: ResolvedObservabilityProfile<TMeta, TContext, TPolicyEvents>;
  policyEvents: TPolicyEvents;
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
    span?.addEvent(options.profile.startedEvent, {
      path: pathLabel,
      ...options.profile.getStartedEventFields?.({
        context,
        meta,
        path,
        pathLabel,
      }),
    });
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
        ...options.profile.getSucceededEventFields?.({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
        }),
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
        ...options.profile.getFailedEventFields?.({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          error: details,
        }),
      });
      options.profile.onFailed?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs,
        error: details,
        policyEvents: options.policyEvents,
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

/**
 * Construct the framework-level baseline observability middleware.
 *
 * @remarks
 * This middleware emits generic `rawr.orpc.*` span attributes/events and one
 * baseline structured log per procedure execution. It does not know about
 * service-specific semantics.
 */
export function createBaseObservabilityMiddleware() {
  const profile: ResolvedObservabilityProfile<
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
    getMeta: getBaseProcedureMeta,
    profile,
    policyEvents: undefined,
  }));
}

/**
 * Construct service-level observability middleware from metadata and a light
 * service profile.
 *
 * @remarks
 * The SDK derives service event names, logger event names, and namespaced span
 * attribute prefixes from service metadata. The service profile only supplies
 * meaningful deltas and bounded hooks.
 */
export function createServiceObservabilityBaselineMiddleware<
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
  profile: ServiceObservabilityProfile<TMeta, TContext, TPolicy>,
  policy: TPolicy,
) {
  const resolvedProfile = resolveServiceObservabilityProfile(baseMetadata, profile);

  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(createObservabilityHandler({
    getMeta(procedure: unknown) {
      return getProcedureMeta(procedure, baseMetadata);
    },
    profile: resolvedProfile,
    policyEvents: policy.events,
  }));
}

/**
 * Construct additive service observability middleware for module/procedure
 * scope without recreating the baseline lifecycle shell.
 */
export function createServiceObservabilityMiddleware<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  baseMetadata: TMeta,
  input: ServiceObservabilityMiddlewareInput<TMeta, TContext>,
) {
  const names = deriveServiceNames(baseMetadata);

  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(async ({ context, path, procedure, next }) => {
    const span = trace.getActiveSpan();
    const startedAt = Date.now();
    const meta = getProcedureMeta(procedure, baseMetadata);
    const pathLabel = path.join(".");

    span?.setAttributes(prefixAttributes(
      names.attributePrefix,
      input.attributes?.({
        context,
        meta,
        path,
        pathLabel,
      }),
    ));
    input.onStarted?.({
      span,
      context,
      meta,
      path,
      pathLabel,
    });

    try {
      const result = await next();

      input.onSucceeded?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs: Date.now() - startedAt,
      });

      return result;
    }
    catch (error) {
      input.onFailed?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs: Date.now() - startedAt,
        error: getErrorDetails(error),
      });

      throw error;
    }
  });
}
