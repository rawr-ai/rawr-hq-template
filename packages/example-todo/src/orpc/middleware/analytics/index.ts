/**
 * @fileoverview Baseline and service analytics middleware.
 *
 * @remarks
 * Analytics has one canonical emission path:
 * - the SDK baseline analytics middleware emits the one service-wide event
 * - required service analytics contributes service-global payload fields
 * - additive module/procedure analytics contributes lower-scope payload fields
 *
 * Service packages do not declare analytics configuration in `service/base.ts`.
 * They supply runtime analytics behavior through required service middleware at
 * the implementer seam.
 */
import type { AnalyticsClient, BaseMetadata, Logger } from "../../baseline/types";
import { createBaseMiddleware } from "../../baseline/middleware";
import { createNormalMiddlewareBuilder } from "../../factory/middleware";
import { getProcedureMeta, resolveLocalAnalyticsPayload } from "./helpers";
import {
  clearAnalyticsState,
  getLocalAnalyticsContributors,
  getRequiredAnalyticsContributor,
  setRequiredAnalyticsContributor,
} from "./state";
import {
  requiredAnalyticsMiddlewareBrand,
  type AnalyticsPayloadArgs,
  type RequiredServiceAnalyticsMiddleware,
  type RequiredServiceAnalyticsMiddlewareInput,
  type ServiceAnalyticsMiddlewareInput,
} from "./types";

export type {
  RequiredServiceAnalyticsMiddleware,
  RequiredServiceAnalyticsMiddlewareInput,
  ServiceAnalyticsMiddlewareInput,
} from "./types";

function brandRequiredAnalyticsMiddleware<
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
    [requiredAnalyticsMiddlewareBrand]: "analytics" as const,
  }) as RequiredServiceAnalyticsMiddleware<TContext, TMeta>;
}

/**
 * Construct the framework-level baseline analytics middleware.
 *
 * @remarks
 * This middleware owns the one canonical `orpc.procedure` emission path. It
 * merges payload in stable precedence:
 * 1. framework baseline fields
 * 2. required service analytics payload
 * 3. additive module/procedure analytics payload
 */
export function createBaseAnalyticsMiddleware() {
  return createBaseMiddleware<{
    deps: {
      analytics: AnalyticsClient;
      logger: Logger;
    };
  }>().middleware(async ({ context, path, procedure, next }) => {
    let outcome: "success" | "error" = "success";
    const pathLabel = path.join(".");
    const fallbackMeta: BaseMetadata = { idempotent: true };
    const meta = getProcedureMeta(procedure, fallbackMeta);

    try {
      const result = await next();
      return result;
    }
    catch (error) {
      outcome = "error";
      throw error;
    }
    finally {
      const payloadArgs: AnalyticsPayloadArgs<BaseMetadata, typeof context> = {
        context,
        meta,
        path,
        pathLabel,
        outcome,
      };

      const requiredPayload = getRequiredAnalyticsContributor(context)?.(payloadArgs) ?? {};
      const localPayload = resolveLocalAnalyticsPayload(context, payloadArgs);
      clearAnalyticsState(context);

      try {
        await context.deps.analytics.track("orpc.procedure", {
          app: meta.domain ?? "service",
          path: pathLabel,
          outcome,
          ...requiredPayload,
          ...localPayload,
        });
      }
      catch (error) {
        context.deps.logger.error("orpc.analytics", {
          path: pathLabel,
          outcome,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}

/**
 * Construct required service-wide analytics middleware.
 *
 * @remarks
 * This middleware does not emit analytics by itself. It contributes the
 * service-global payload layer that the SDK baseline analytics emitter merges
 * into the one canonical event.
 */
export function createRequiredServiceAnalyticsMiddleware<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  baseMetadata: TMeta,
  input: RequiredServiceAnalyticsMiddlewareInput<TMeta, TContext>,
) {
  const middleware = createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(async ({ context, next, path, procedure }) => {
    if (input.payload) {
      const pathLabel = path.join(".");
      const meta = getProcedureMeta(procedure, baseMetadata);

      setRequiredAnalyticsContributor<TMeta, TContext>(
        context,
        ({ outcome }) =>
          input.payload?.({
            context,
            meta,
            path,
            pathLabel,
            outcome,
          }),
      );
    }

    return next();
  });

  return brandRequiredAnalyticsMiddleware<TContext, TMeta>(middleware);
}

/**
 * Construct additive analytics middleware for module/procedure-local usage.
 *
 * @remarks
 * This builder contributes lower-scope payload deltas only. It must not be
 * used to satisfy the required service analytics slot.
 */
export function createServiceAnalyticsMiddleware<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  baseMetadata: TMeta,
  input: ServiceAnalyticsMiddlewareInput<TMeta, TContext>,
) {
  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(async ({ context, next, path, procedure }) => {
    if (input.payload) {
      const pathLabel = path.join(".");
      const meta = getProcedureMeta(procedure, baseMetadata);

      getLocalAnalyticsContributors<TMeta, TContext>(context).push(
        ({ outcome }) =>
          input.payload?.({
            context,
            meta,
            path,
            pathLabel,
            outcome,
          }) as Record<string, unknown> | undefined,
      );
    }

    return next();
  });
}
