/**
 * @fileoverview ORPC analytics middleware (proto SDK layer).
 *
 * @remarks
 * Emits one analytics event per procedure execution. This is baseline-only:
 * it must not affect procedure behavior or remap errors.
 */
import type { AnalyticsClient } from "../base";
import { createBaseMiddleware } from "../factory";

export type AnalyticsMiddlewareOptions = {
  app: string;
};

export function createAnalyticsMiddleware(options: AnalyticsMiddlewareOptions) {
  return createBaseMiddleware<{
    deps: {
      analytics: AnalyticsClient;
    };
  }>().middleware(async ({ context, path, next }) => {
    const result = await next();
    await context.deps.analytics.track("orpc.procedure", {
      app: options.app,
      path: path.join("."),
    });
    return result;
  });
}
