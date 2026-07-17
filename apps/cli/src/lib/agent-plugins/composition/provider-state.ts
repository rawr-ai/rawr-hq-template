import type { ProviderOwnerRuntime } from "@rawr/agent-provider-deployment/owner-protocol";
import {
  createNodeProviderOwnerRuntime,
  openNodeProviderState,
  type NativeMemberRestorationPorts,
  type NodeProviderState,
} from "@rawr/agent-provider-deployment/node-state";

import type { AgentPluginControllerLayout } from "../layout";

type ProviderStateLayout = Pick<
  AgentPluginControllerLayout,
  "providerProjectionRoot" | "providerTargetStateRoot"
>;

export async function openControllerProviderState(
  layout: ProviderStateLayout,
): Promise<NodeProviderState> {
  return await openNodeProviderState({
    providerProjectionRoot: layout.providerProjectionRoot,
    providerTargetStateRoot: layout.providerTargetStateRoot,
  });
}

export function createControllerProviderOwnerRuntime(
  state: NodeProviderState,
  members: NativeMemberRestorationPorts,
): ProviderOwnerRuntime {
  return createNodeProviderOwnerRuntime({
    projections: state.projections,
    targets: state.targets,
    members,
  });
}
