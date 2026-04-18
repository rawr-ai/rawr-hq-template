import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";

export function createClientOptions(): CreateClientOptions {
  const deps: Service["Deps"] = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
  };

  return {
    deps,
    scope: {
      repoRoot: "/tmp/workspace",
    },
    config: {},
  };
}
