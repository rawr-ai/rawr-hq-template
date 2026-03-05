/**
 * @fileoverview Mock analytics middleware (wireframe only).
 *
 * @remarks
 * This exists purely to illustrate "always-on" middleware requirements and how
 * they relate to the SDK baseline context (`BaseContext`).
 *
 * Nothing in the todo service uses this yet.
 */

import { os } from "@orpc/server";

import type { BaseContext, BaseDeps } from "../../base";

export type AnalyticsClient = {
  track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
};

export type AnalyticsDeps = BaseDeps & {
  analytics: AnalyticsClient;
};

export type AnalyticsContext = BaseContext<AnalyticsDeps>;

export type WithAnalyticsOptions = {
  app: string;
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

