/**
 * @fileoverview Analytics middleware (proto SDK layer).
 *
 * @remarks
 * Emits one analytics event per procedure execution. This is baseline-only:
 * it must not affect procedure behavior or remap errors.
 */
import type { AnalyticsClient } from "../base";
import { createBaseMiddleware } from "../factory";

/**
 * Create baseline analytics middleware.
 *
 * @remarks
 * This is configurable middleware, so it exports a constructor rather than a
 * ready-to-use value. Required runtime dependencies still mirror the context
 * shape directly under `deps`.
 */
export function createAnalyticsMiddleware(options: { app: string }) {
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
