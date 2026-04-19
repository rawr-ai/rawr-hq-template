import { createClient } from "@rawr/hq-ops";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

export function createHqOpsClient(repoRoot: string) {
  return createClient({
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {
      repoRoot,
    },
    config: {},
  });
}

export function createHqOpsInvocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export type HqOpsClient = ReturnType<typeof createHqOpsClient>;
