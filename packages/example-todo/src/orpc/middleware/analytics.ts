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
import type { BaseMetadata } from "../base";
import type { AnalyticsClient, Logger } from "../base";
import { createBaseMiddleware } from "../base-foundation";
import { createNormalMiddlewareBuilder } from "../factory/middleware";

type AnalyticsPayloadArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
  outcome: "success" | "error";
};

type AnalyticsPayloadContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
> = (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown> | undefined;

export type RequiredServiceAnalyticsMiddlewareInput<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown>;
};

export type ServiceAnalyticsMiddlewareInput<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown>;
};

const requiredAnalyticsMiddlewareBrand = Symbol("rawr.orpc.requiredAnalyticsMiddleware");

export type RequiredServiceAnalyticsMiddleware<
  TContext extends object = object,
  TMeta extends BaseMetadata = BaseMetadata,
> = ReturnType<
  typeof createNormalMiddlewareBuilder<TContext, TMeta>
>["middleware"] extends (callback: infer _T) => infer TMiddleware
  ? TMiddleware & { readonly [requiredAnalyticsMiddlewareBrand]: "analytics" }
  : never;

const analyticsState = new WeakMap<object, {
  requiredContributor?: AnalyticsPayloadContributor<any, any>;
  localContributors?: AnalyticsPayloadContributor<any, any>[];
}>();

function getAnalyticsCarrier(context: object) {
  const maybeInvocation = (context as { invocation?: object }).invocation;
  if (typeof maybeInvocation === "object" && maybeInvocation !== null) {
    return maybeInvocation;
  }

  const maybeProvided = (context as { provided?: object }).provided;
  return typeof maybeProvided === "object" && maybeProvided !== null ? maybeProvided : context;
}

function getAnalyticsState(context: object) {
  const carrier = getAnalyticsCarrier(context);
  let state = analyticsState.get(carrier);
  if (!state) {
    state = {};
    analyticsState.set(carrier, state);
  }

  return state;
}

function clearAnalyticsState(context: object) {
  analyticsState.delete(getAnalyticsCarrier(context));
}

function getProcedureMeta<TMeta extends BaseMetadata>(
  procedure: unknown,
  fallback: TMeta,
): TMeta {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: TMeta } };
  return anyProcedure?.["~orpc"]?.meta ?? fallback;
}

function getRequiredAnalyticsContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
>(context: TContext) {
  return getAnalyticsState(context).requiredContributor as
    | AnalyticsPayloadContributor<TMeta, TContext>
    | undefined;
}

function setRequiredAnalyticsContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  context: TContext,
  contributor: AnalyticsPayloadContributor<TMeta, TContext>,
) {
  getAnalyticsState(context).requiredContributor = contributor as AnalyticsPayloadContributor<any, any>;
}

function getLocalAnalyticsContributors<
  TMeta extends BaseMetadata,
  TContext extends object,
>(context: TContext) {
  const state = getAnalyticsState(context);
  state.localContributors ??= [];
  return state.localContributors as AnalyticsPayloadContributor<TMeta, TContext>[];
}

function resolveLocalAnalyticsPayload<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  context: TContext,
  args: AnalyticsPayloadArgs<TMeta, TContext>,
) {
  const contributors = getAnalyticsState(context).localContributors as
    | AnalyticsPayloadContributor<TMeta, TContext>[]
    | undefined
    ?? [];

  if (contributors.length === 0) {
    return {};
  }

  const payload = Object.assign(
    {},
    ...contributors.map((contributor) => contributor(args) ?? {}),
  );

  return payload;
}

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
