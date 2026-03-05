/**
 * @fileoverview ORPC analytics middleware (proto SDK layer).
 *
 * @remarks
 * Emits one analytics event per procedure execution. This is baseline-only:
 * it must not affect procedure behavior or remap errors.
 */

import { os } from "@orpc/server";

import type { AnalyticsClient } from "../base";

export type WithAnalyticsOptions = {
  app: string;
};

/**
 * Analytics deps requirement (baseline).
 */
export type AnalyticsDeps = {
  analytics: AnalyticsClient;
};

export type AnalyticsContext = {
  deps: AnalyticsDeps;
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
