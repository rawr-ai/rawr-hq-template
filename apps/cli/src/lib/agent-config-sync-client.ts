import {
  createClient,
  type Client,
  type CreateClientOptions,
} from "@rawr/agent-config-sync";
import { createNodeAgentConfigSyncResources } from "@rawr/agent-config-sync-node/resources";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";

type AgentConfigSyncCallOptions = NonNullable<Parameters<Client["undo"]["runUndo"]>[1]>;
type AgentConfigSyncProcess = ProcessView & {
  processId: "rawr-cli";
  repoRoot: string;
};
type AgentConfigSyncRole = RoleView & {
  roleId: "agent-config-sync";
  capability: "undo";
};
type BindingContext = ServiceBindingContext<AgentConfigSyncProcess, AgentConfigSyncRole>;

const agentConfigSyncService = bindService(createClient, {
  bindingId: "rawr-cli/agent-config-sync",
  deps: () => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: createNodeAgentConfigSyncResources(),
  }),
  scope: (context: BindingContext) => ({
    repoRoot: context.process.repoRoot,
  }),
  config: {},
} satisfies ServiceBinding<CreateClientOptions, AgentConfigSyncProcess, AgentConfigSyncRole>);

export function createAgentConfigSyncClient(repoRoot: string): Client {
  return agentConfigSyncService.resolve({
    process: {
      processId: "rawr-cli",
      repoRoot,
    },
    role: {
      roleId: "agent-config-sync",
      capability: "undo",
    },
  });
}

export function createAgentConfigSyncCallOptions(traceId: string): AgentConfigSyncCallOptions {
  const options = {
    context: {
      invocation: {
        traceId,
      },
    },
  } satisfies AgentConfigSyncCallOptions;

  return options;
}
