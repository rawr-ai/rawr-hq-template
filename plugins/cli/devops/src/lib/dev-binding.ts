import { createClient, type Client, type CreateClientOptions } from "@rawr/dev";
import { createNodeDevResources } from "@rawr/dev-node/resources";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { bindService, type ProcessView, type RoleView, type ServiceBinding, type ServiceBindingContext } from "@rawr/hq-sdk/plugins";

type DevopsProcess = ProcessView & {
  processId: "plugin-devops";
  workspaceRoot: string;
};

type DevopsRole = RoleView & {
  roleId: "dev";
  capability: "devops";
};

type BindingContext = ServiceBindingContext<DevopsProcess, DevopsRole>;

const devService = bindService(createClient, {
  bindingId: "plugin-devops/dev",
  deps: (_context: BindingContext) => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: createNodeDevResources(),
  }),
  scope: (context: BindingContext) => ({
    workspaceRoot: context.process.workspaceRoot,
  }),
  config: {},
} satisfies ServiceBinding<CreateClientOptions, DevopsProcess, DevopsRole>);

export function createDevClient(input: { workspaceRoot: string }): Client {
  return devService.resolve({
    process: {
      processId: "plugin-devops",
      workspaceRoot: input.workspaceRoot,
    },
    role: {
      roleId: "dev",
      capability: "devops",
    },
  });
}
