import type { Middleware } from "@orpc/server";

import type { BaseMetadata } from "../metadata";
import { getProcedureMetadata } from "../metadata";
import type { AnalyticsClient, Logger } from "../ports";

/** Procedure facts available when a service enriches its analytics event. */
export type AnalyticsPayloadArgs<TMeta extends BaseMetadata, TContext extends object> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
  outcome: "success" | "error";
};

/** Service-owned additions to the generic procedure analytics event. */
export type AnalyticsMiddlewareInput<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown> | undefined;
};

type AnalyticsContext = {
  deps: {
    analytics: AnalyticsClient;
    logger: Logger;
  };
};

/** Creates context-preserving analytics middleware over host-provided capabilities. */
export function createAnalyticsMiddlewareCallback<
  TContext extends AnalyticsContext,
  TMeta extends BaseMetadata = BaseMetadata,
>(
  metadataDefaults: TMeta,
  input: AnalyticsMiddlewareInput<TMeta, TContext> = {}
): Middleware<TContext, object, unknown, unknown, Record<never, never>> {
  return async ({ context, path, procedure, next }) => {
    let outcome: "success" | "error" = "success";
    const pathLabel = path.join(".");
    const meta = {
      ...metadataDefaults,
      ...getProcedureMetadata(procedure),
    };

    try {
      return await next();
    } catch (error) {
      outcome = "error";
      throw error;
    } finally {
      const payloadArgs: AnalyticsPayloadArgs<TMeta, TContext> = {
        context,
        meta,
        path,
        pathLabel,
        outcome,
      };

      try {
        await context.deps.analytics.track("orpc.procedure", {
          app: meta.domain ?? "service",
          path: pathLabel,
          outcome,
          ...input.payload?.(payloadArgs),
        });
      } catch (error) {
        try {
          context.deps.logger.error("orpc.analytics", {
            path: pathLabel,
            outcome,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        } catch {
          // Telemetry failures never replace the procedure outcome.
        }
      }
    }
  };
}
