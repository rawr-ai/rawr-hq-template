import type { AnalyticsClient } from "../../ports/analytics";

/**
 * @fileoverview Embedded placeholder analytics adapter.
 *
 * @remarks
 * This is a temporary embedded adapter used to make the host-adapter shape
 * explicit in tests and in-process composition. It is not the final analytics
 * integration for the package.
 */

export type EmbeddedPlaceholderAnalyticsEntry = {
  event: string;
  payload: Record<string, unknown>;
};

type EmbeddedPlaceholderAnalyticsOptions = {
  sink?: EmbeddedPlaceholderAnalyticsEntry[];
};

export function createEmbeddedPlaceholderAnalyticsAdapter(
  options: EmbeddedPlaceholderAnalyticsOptions = {},
): AnalyticsClient {
  return {
    track(event, payload) {
      options.sink?.push({
        event,
        payload: (payload as Record<string, unknown> | undefined) ?? {},
      });
    },
  };
}
