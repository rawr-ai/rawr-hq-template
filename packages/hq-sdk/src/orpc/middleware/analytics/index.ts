import type { Middleware } from "@orpc/server";
import type { BaseMetadata } from "../../metadata";
import { getProcedureMetadata } from "../../metadata";
import type { AnalyticsClient } from "../../ports/analytics";
import type { Logger } from "../../ports/logger";
import type { AnalyticsMiddlewareInput, AnalyticsPayloadArgs } from "./types";

export type {
  AnalyticsMiddlewareInput,
  AnalyticsPayloadArgs,
} from "./types";

type AnalyticsContext = {
  deps: {
    analytics: AnalyticsClient;
    logger: Logger;
  };
};

/**
 * Creates the callback a service base authors as its analytics middleware.
 *
 * @remarks
 * The callback consumes only the analytics and logger capabilities it needs.
 * Each service's native oRPC base owns context compatibility and middleware
 * construction; this function adds no context and maintains no provider state.
 */
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
