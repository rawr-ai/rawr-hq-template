import {
  openNodeRuntimeLayout,
  type NodeRuntimeLayout,
  type NodeRuntimeRoots,
} from "./filesystem";
import { createNodeProjectionStore, type NodeProjectionStore } from "./projections";
import { createNodeTargetStateStore, type NodeTargetStateStore } from "./target-state";
export {
  createNodeProviderOwnerRuntime,
  type NativeMemberRestorationPort,
  type NativeMemberRestorationPorts,
} from "./owner-runtime";

export interface NodeProviderState {
  readonly layout: NodeRuntimeLayout;
  readonly projections: NodeProjectionStore;
  readonly targets: NodeTargetStateStore;
}

export async function openNodeProviderState(roots: NodeRuntimeRoots): Promise<NodeProviderState> {
  const layout = await openNodeRuntimeLayout(roots);
  return Object.freeze({
    layout,
    projections: createNodeProjectionStore(layout),
    targets: createNodeTargetStateStore(layout),
  });
}

export {
  canonicalizeNodeProviderTargets,
  decodeSidecar,
  serializeSidecar,
  type NodeTargetStateStore,
  type ProviderTargetLocator,
} from "./target-state";

export type {
  NodeProjectionMaterialization,
  NodeProjectionMemberSource,
  NodeProjectionStore,
} from "./projections";

export type { NodeRuntimeLayout, NodeRuntimeRoots } from "./filesystem";
