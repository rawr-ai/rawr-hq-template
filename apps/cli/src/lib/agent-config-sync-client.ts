import { createClient, type Client } from "@rawr/agent-config-sync/client";
import { createNodeAgentConfigSyncResources } from "@rawr/agent-config-sync-node/resources";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

type AgentConfigSyncCallOptions = NonNullable<Parameters<Client["undo"]["runUndo"]>[1]>;

export function createAgentConfigSyncClient(repoRoot: string): Client {
  return createClient({
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      resources: createNodeAgentConfigSyncResources(),
    },
    scope: {
      repoRoot,
    },
    config: {},
  });
}

export function createAgentConfigSyncCallOptions(traceId: string): AgentConfigSyncCallOptions {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  };
}
