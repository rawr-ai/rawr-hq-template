/**
 * @fileoverview Baseline analytics middleware.
 *
 * @remarks
 * Observer middleware: it emits one analytics event per procedure execution and
 * must not affect procedure behavior.
 */
import type { AnalyticsClient } from "../base";
import { createBaseMiddleware } from "../base-foundation";

export type BaseAnalyticsProfile = {
  app: string;
  event?: string;
  getPayload?: (args: {
    pathLabel: string;
    outcome: "success" | "error";
  }) => Record<string, unknown>;
};

/**
 * Construct analytics middleware.
 *
 * @remarks
 * This is configurable middleware, so it exports a constructor rather than a
 * ready-to-use value.
 */
export function createAnalyticsMiddleware(profile: BaseAnalyticsProfile) {
  return createBaseMiddleware<{
    deps: {
      analytics: AnalyticsClient;
    };
  }>().middleware(async ({ context, path, next }) => {
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
      await context.deps.analytics.track(profile.event ?? "orpc.procedure", {
        app: profile.app,
        path: pathLabel,
        outcome,
        ...profile.getPayload?.({
          pathLabel,
          outcome,
        }),
      });
    }
  });
}
