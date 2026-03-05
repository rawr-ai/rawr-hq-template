/**
 * @fileoverview ORPC analytics middleware (proto SDK layer).
 *
 * @remarks
 * Emits one analytics event per procedure execution. This is baseline-only:
 * it must not affect procedure behavior or remap errors.
 */

import { os } from "@orpc/server";

import type { AnalyticsClient, BaseContext, BaseDeps } from "../base";

export type WithAnalyticsOptions = {
  app: string;
};

/**
 * Analytics deps requirement (SDK baseline).
 *
 * @remarks
 * Analytics is guaranteed baseline middleware, so its requirements should be
 * expressible in terms of the SDK's single baseline primitive (`BaseContext`).
 */
export type AnalyticsDeps = Pick<BaseDeps, "analytics">;

export type AnalyticsContext = BaseContext<AnalyticsDeps>;

/**
 * Legacy standalone deps shape (kept for side-by-side comparison).
 */
export type AnalyticsContextLegacy = {
  deps: {
    analytics: AnalyticsClient;
  };
};

export function withAnalytics<TContext extends AnalyticsContext = AnalyticsContext>(
  options: WithAnalyticsOptions,
) {
  return os.$context<TContext>().middleware(async ({ context, path, next }) => {
    const result = await next();
    await context.deps.analytics.track("orpc.procedure", {
      app: options.app,
      path: path.join("."),
    });
    return result;
  });
}

