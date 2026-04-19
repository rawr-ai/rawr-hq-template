import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { SessionIntelligenceBoundary } from "./types";
import { createNodeSessionIndexRuntime } from "./index-runtime";
import { createNodeSessionSourceRuntime } from "./source-runtime";

export type SessionIntelligenceBoundaryInput = {
  logger?: SessionIntelligenceBoundary["deps"]["logger"];
  analytics?: SessionIntelligenceBoundary["deps"]["analytics"];
};

export function createNodeSessionIntelligenceBoundary(
  input: SessionIntelligenceBoundaryInput = {},
): SessionIntelligenceBoundary {
  return {
    deps: {
      logger: input.logger ?? createEmbeddedPlaceholderLoggerAdapter(),
      analytics: input.analytics ?? createEmbeddedPlaceholderAnalyticsAdapter(),
      sessionSourceRuntime: createNodeSessionSourceRuntime(),
      sessionIndexRuntime: createNodeSessionIndexRuntime(),
    },
    scope: {},
    config: {},
  };
}
