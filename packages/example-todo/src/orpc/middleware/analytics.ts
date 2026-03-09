/**
 * @fileoverview Baseline analytics middleware and service analytics profile types.
 *
 * @remarks
 * Analytics remains baseline-on for every package, but service packages should
 * only supply package-specific deltas here. The SDK owns the baseline event
 * name and derives package identity from service metadata.
 */
import type { BaseMetadata } from "../base";
import { createNormalMiddlewareBuilder } from "../factory/middleware";
import type { AnalyticsClient } from "../base";

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

export type ServiceAnalyticsProfile<
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

type AnalyticsPayloadContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
> = (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown> | undefined;

const localAnalyticsContributorsSymbol = Symbol("rawr.orpc.localAnalyticsContributors");

function getAnalyticsCarrier(context: object) {
  const maybeInvocation = (context as { invocation?: object }).invocation;
  if (typeof maybeInvocation === "object" && maybeInvocation !== null) {
    return maybeInvocation;
  }

  const maybeProvided = (context as { provided?: object }).provided;
  return typeof maybeProvided === "object" && maybeProvided !== null ? maybeProvided : context;
}

function getProcedureMeta<TMeta extends BaseMetadata>(
  procedure: unknown,
  fallback: TMeta,
): TMeta {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: TMeta } };
  return anyProcedure?.["~orpc"]?.meta ?? fallback;
}

function getLocalAnalyticsContributors<
  TMeta extends BaseMetadata,
  TContext extends object,
>(context: TContext) {
  const carrier = getAnalyticsCarrier(context) as {
    [localAnalyticsContributorsSymbol]?: AnalyticsPayloadContributor<TMeta, TContext>[];
  };

  carrier[localAnalyticsContributorsSymbol] ??= [];
  return carrier[localAnalyticsContributorsSymbol];
}

function resolveLocalAnalyticsPayload<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  context: TContext,
  args: AnalyticsPayloadArgs<TMeta, TContext>,
) {
  const carrier = getAnalyticsCarrier(context) as {
    [localAnalyticsContributorsSymbol]?: AnalyticsPayloadContributor<TMeta, TContext>[];
  };
  const contributors = carrier[localAnalyticsContributorsSymbol] ?? [];

  if (contributors.length === 0) {
    return {};
  }

  const payload = Object.assign(
    {},
    ...contributors.map((contributor) => contributor(args) ?? {}),
  );

  delete carrier[localAnalyticsContributorsSymbol];
  return payload;
}

/**
 * Construct service-level analytics middleware from metadata and a lightweight
 * service profile.
 *
 * @remarks
 * The baseline event name is always `orpc.procedure`. Package identity is
 * derived from `metadata.domain` and included as `app` automatically.
 */
export function createServiceAnalyticsBaselineMiddleware<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      analytics: AnalyticsClient;
    };
  },
>(
  baseMetadata: TMeta,
  profile: ServiceAnalyticsProfile<TMeta, TContext>,
) {
  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(async ({ context, path, procedure, next }) => {
    let outcome: "success" | "error" = "success";
    const pathLabel = path.join(".");
    const meta = getProcedureMeta(procedure, baseMetadata);

    try {
      const result = await next();
      return result;
    }
    catch (error) {
      outcome = "error";
      throw error;
    }
    finally {
      const payloadArgs: AnalyticsPayloadArgs<TMeta, TContext> = {
        context,
        meta,
        path,
        pathLabel,
        outcome,
      };

      await context.deps.analytics.track("orpc.procedure", {
        app: meta.domain ?? "service",
        path: pathLabel,
        outcome,
        ...profile.payload?.(payloadArgs),
        ...resolveLocalAnalyticsPayload(context, payloadArgs),
      });
    }
  });
}

/**
 * Construct additive analytics middleware for module/procedure-local usage.
 *
 * @remarks
 * This builder does not emit analytics by itself. It contributes payload
 * fields that the service-wide baseline analytics middleware will merge into
 * the one canonical `orpc.procedure` event.
 */
export function createServiceAnalyticsMiddleware<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      analytics: AnalyticsClient;
    };
  },
>(
  baseMetadata: TMeta,
  input: ServiceAnalyticsMiddlewareInput<TMeta, TContext>,
) {
  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(async ({ context, next }) => {
    if (input.payload) {
      getLocalAnalyticsContributors<TMeta, TContext>(context).push(
        input.payload as AnalyticsPayloadContributor<TMeta, TContext>,
      );
    }

    return next();
  });
}
