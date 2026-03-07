/**
 * @fileoverview Baseline analytics middleware.
 *
 * @remarks
 * Observer middleware: it emits one analytics event per procedure execution and
 * must not affect procedure behavior.
 */
import type { AnalyticsClient } from "../base";
import { createBaseMiddleware } from "../base-foundation";

/**
 * Construct analytics middleware.
 *
 * @remarks
 * This is configurable middleware, so it exports a constructor rather than a
 * ready-to-use value.
 */
export function createAnalyticsMiddleware(options: { app: string }) {
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
      await context.deps.analytics.track("orpc.procedure", {
        app: options.app,
        path: path.join("."),
        outcome,
      });
    }
  });
}
