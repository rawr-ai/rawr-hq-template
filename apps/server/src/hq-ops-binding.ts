import { createClient, type Client as HqOpsClient, type CreateClientOptions } from "@rawr/hq-ops";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";
import { createHqOpsResources } from "./hq-ops-resources";
import { createHostLoggerAdapter } from "./logging";

type HqOpsProcess = ProcessView &
  Readonly<{
    processId: "server";
    repoRoot: string;
  }>;

type HqOpsRole = RoleView &
  Readonly<{
    roleId: "hq-ops-config";
    capability: "workspace-config";
  }>;

type BindingContext = ServiceBindingContext<HqOpsProcess, HqOpsRole>;

const hqOps = bindService(createClient, {
  bindingId: "server/hq-ops-config",
  deps: () => ({
    logger: createHostLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: createHqOpsResources(),
  }),
  scope: (context: BindingContext) => ({ repoRoot: context.process.repoRoot }),
  config: {},
  cacheKey: (context: BindingContext) =>
    `${context.process.processId}:${context.process.repoRoot}:${context.role.roleId}`,
} satisfies ServiceBinding<CreateClientOptions, HqOpsProcess, HqOpsRole>);

/** Resolves the host-scoped HQ Ops client without making bootstrap a service boundary. */
export function resolveServerHqOpsClient(repoRoot: string): Pick<HqOpsClient, "config"> {
  return hqOps.resolve({
    process: { processId: "server", repoRoot },
    role: { roleId: "hq-ops-config", capability: "workspace-config" },
  });
}
