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

export type ServiceAnalyticsProfile<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    outcome: "success" | "error";
  }) => Record<string, unknown>;
};

/**
 * Construct service-level analytics middleware from metadata and a lightweight
 * service profile.
 *
 * @remarks
 * The baseline event name is always `orpc.procedure`. Package identity is
 * derived from `metadata.domain` and included as `app` automatically.
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
  profile: ServiceAnalyticsProfile<TMeta, TContext>,
) {
  return createNormalMiddlewareBuilder<TContext, TMeta>({
    baseMetadata,
  }).middleware(async ({ context, path, procedure, next }) => {
    let outcome: "success" | "error" = "success";

    try {
      const result = await next();
      return result;
    }
    catch (error) {
      outcome = "error";
      throw error;
    }
    finally {
      const pathLabel = path.join(".");
      const anyProcedure = procedure as { ["~orpc"]?: { meta?: TMeta } };
      const meta = anyProcedure?.["~orpc"]?.meta ?? baseMetadata;

      await context.deps.analytics.track("orpc.procedure", {
        app: meta.domain ?? "service",
        path: pathLabel,
        outcome,
        ...profile.payload?.({
          context,
          meta,
          path,
          pathLabel,
          outcome,
        }),
      });
    }
  });
}
