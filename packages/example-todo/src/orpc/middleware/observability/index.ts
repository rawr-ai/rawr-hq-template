/**
 * @fileoverview Framework, required service, and additive observability middleware.
 *
 * @remarks
 * Observability uses two wrapper layers plus additive lower-scope middleware:
 * - framework baseline observability wrapper
 * - required service observability wrapper
 * - additive module/procedure observability middleware
 *
 * This is intentionally not modeled like analytics. Service-wide observability
 * needs real lifecycle wrapper behavior, not just a late payload contributor.
 */
import { createBaseMiddleware } from "../../baseline/middleware";
import type { BaseMetadata } from "../../baseline/types";
import type { Logger } from "../../ports/logger";
import { createNormalMiddlewareBuilder } from "../../factory/middleware";
import { trace } from "../../host-adapters/telemetry/opentelemetry";
import { getErrorDetails } from "./errors";
import { createObservabilityHandler } from "./handler";
import { deriveServiceNames, prefixAttributes } from "./naming";
import {
  createBaseObservabilityProfile,
  resolveRequiredServiceObservabilityProfile,
} from "./profiles";
import {
  requiredObservabilityMiddlewareBrand,
  type RequiredServiceObservabilityMiddleware,
  type RequiredServiceObservabilityMiddlewareInput,
  type ServiceObservabilityMiddlewareInput,
} from "./types";

export type {
  ObservabilityErrorDetails,
  RequiredServiceObservabilityMiddleware,
  RequiredServiceObservabilityMiddlewareInput,
  ServiceObservabilityMiddlewareInput,
} from "./types";

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

function brandRequiredObservabilityMiddleware<
  TContext extends object,
  TMeta extends BaseMetadata,
>(
  middleware: ReturnType<typeof createNormalMiddlewareBuilder<TContext, TMeta>> extends {
    middleware(callback: infer _T): infer TMiddleware;
  }
    ? TMiddleware
    : never,
) {
  return Object.assign(middleware, {
    [requiredObservabilityMiddlewareBrand]: "observability" as const,
  }) as RequiredServiceObservabilityMiddleware<TContext, TMeta>;
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
  return createBaseMiddleware<{
    deps: {
      logger: Logger;
    };
  }>().middleware(createObservabilityHandler({
    getMeta: getBaseProcedureMeta,
    profile: createBaseObservabilityProfile(),
    policyEvents: undefined,
  }));
}

/**
 * Construct required service-wide observability middleware.
 *
 * @remarks
 * This wrapper owns service-global observability behavior on top of the
 * framework baseline observability wrapper. It is the canonical required
 * service middleware extension seam for service-global observability behavior
 * that the SDK cannot infer on its own.
 *
 * This required extension may define:
 * - service-global span attributes
 * - service-global structured log fields
 * - service-global event attributes
 * - service-global lifecycle behavior
 *
 * It must not depend on `context.provided.*`.
 */
export function createRequiredServiceObservabilityMiddleware<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicyEvents extends Record<string, string | undefined> | undefined,
>(
  baseMetadata: TMeta,
  input: RequiredServiceObservabilityMiddlewareInput<TMeta, TContext, TPolicyEvents>,
  policyEvents: TPolicyEvents,
) {
  const profile = resolveRequiredServiceObservabilityProfile(baseMetadata, input);
  const handler = createObservabilityHandler({
    getMeta(procedure: unknown) {
      return getProcedureMeta(procedure, baseMetadata);
    },
    profile,
    policyEvents,
  });

  const middleware = createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(handler);

  return brandRequiredObservabilityMiddleware<TContext, TMeta>(middleware);
}

/**
 * Construct additive service observability middleware for module/procedure
 * scope without recreating the required service lifecycle wrapper.
 *
 * @remarks
 * This is not a required service middleware extension. Use it only for
 * lower-scope additive observability on module/procedure branches.
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
      input.spanAttributes?.({
        context,
        meta,
        path,
        pathLabel,
      }),
    ));
    input.onStart?.({
      span,
      context,
      meta,
      path,
      pathLabel,
    });

    try {
      const result = await next();

      input.onSuccess?.({
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
      input.onError?.({
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
