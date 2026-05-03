import {
  createClient,
  type Client,
  type CreateClientOptions,
} from "@rawr/agent-config-sync";
import type { AgentConfigSyncUndoCapture } from "@rawr/agent-config-sync/resources";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { bindService, type ProcessView, type RoleView, type ServiceBinding, type ServiceBindingContext } from "@rawr/hq-sdk/plugins";
import { createNodeAgentConfigSyncResources } from "./agent-config-sync-resources/resources";

type UndoCaptureLike = AgentConfigSyncUndoCapture;

type AgentConfigSyncProcess = ProcessView & {
  processId: "plugin-plugins";
  repoRoot: string;
  undoCapture?: UndoCaptureLike;
};

type AgentConfigSyncRole = RoleView & {
  roleId: "agent-config-sync";
  capability: "plugins-sync";
};

type BindingContext = ServiceBindingContext<AgentConfigSyncProcess, AgentConfigSyncRole>;

/**
 * Typed service binding for standalone agent destination sync.
 *
 * The CLI supplies local resources and optional undo capture, while destination
 * planning/execution semantics remain inside agent-config-sync.
 */
const agentConfigSyncService = bindService(createClient, {
  bindingId: "plugin-plugins/agent-config-sync",
  deps: (context: BindingContext) => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: createNodeAgentConfigSyncResources(),
    undoCapture: context.process.undoCapture,
  }),
  scope: (context: BindingContext) => ({
    repoRoot: context.process.repoRoot,
  }),
  config: {},
} satisfies ServiceBinding<CreateClientOptions, AgentConfigSyncProcess, AgentConfigSyncRole>);

/**
 * Creates an agent-config-sync client scoped to one repo root and optional undo
 * capture for mutating sync runs.
 */
export function createAgentConfigSyncClient(input: {
  repoRoot: string;
  undoCapture?: UndoCaptureLike;
}): Client {
  return agentConfigSyncService.resolve({
    process: {
      processId: "plugin-plugins",
      repoRoot: input.repoRoot,
      undoCapture: input.undoCapture,
    },
    role: {
      roleId: "agent-config-sync",
      capability: "plugins-sync",
    },
  });
}
