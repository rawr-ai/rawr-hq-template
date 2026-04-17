import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { AnalyticsClient, Logger } from "@rawr/hq-sdk";
import { createNodeConfigStore } from "./config-store";
import { createNodeJournalStore } from "./journal/store";
import { createNodeRepoStateStore } from "./repo-state-store";
import { createNodeSecurityRuntime } from "./security/runtime";

export type HqOpsBoundary = {
  deps: {
    logger: Logger;
    analytics: AnalyticsClient;
    configStore: ReturnType<typeof createNodeConfigStore>;
    repoStateStore: ReturnType<typeof createNodeRepoStateStore>;
    journalStore: ReturnType<typeof createNodeJournalStore>;
    securityRuntime: ReturnType<typeof createNodeSecurityRuntime>;
  };
  scope: {
    repoRoot: string;
  };
  config: {};
};

export type HqOpsBoundaryInput = {
  repoRoot: string;
  logger?: Logger;
  analytics?: AnalyticsClient;
  hostLogger?: Logger;
};

export function createNodeHqOpsBoundary(input: HqOpsBoundaryInput): HqOpsBoundary {
  const logger = input.logger ?? input.hostLogger ?? createEmbeddedPlaceholderLoggerAdapter();
  const analytics = input.analytics ?? createEmbeddedPlaceholderAnalyticsAdapter();

  return {
    deps: {
      logger,
      analytics,
      configStore: createNodeConfigStore(),
      repoStateStore: createNodeRepoStateStore(),
      journalStore: createNodeJournalStore(),
      securityRuntime: createNodeSecurityRuntime(),
    },
    scope: {
      repoRoot: input.repoRoot,
    },
    config: {},
  };
}
