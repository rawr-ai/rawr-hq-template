import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import type { AgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records";
import { makeNodeAgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records/providers/effect-platform-node";

import { createNodeNativeProviderResource } from "../../bindings/providers";

type ProviderLifecycleDeps = Pick<
  Deps,
  | "providerRecords"
  | "providerNativeResource"
  | "providerExecutables"
  | "providerProjectionRepositoryRoot"
>;

export function createNodeProviderLifecycleDeps(options: Readonly<{
  state: NodeProviderRecordState;
  providerExecutables: ProviderLifecycleDeps["providerExecutables"];
}>): ProviderLifecycleDeps {
  return Object.freeze({
    providerRecords: options.state.records,
    providerNativeResource: createNodeNativeProviderResource(),
    providerExecutables: options.providerExecutables,
    providerProjectionRepositoryRoot: options.state.projectionRepositoryRoot,
  });
}

export interface NodeProviderRecordRoots {
  readonly controllerDataRoot: string;
  readonly providerProjectionRoot: string;
  readonly providerTargetStateRoot: string;
}

export type NodeProviderRecordState = Readonly<{
  records: AgentProviderRecordsAsyncPort;
  projectionRepositoryRoot: string;
}>;

/** Creates the raw provider resources once at the controller host edge. */
export function createNodeProviderRecordState(
  roots: NodeProviderRecordRoots,
): NodeProviderRecordState {
  const records = makeNodeAgentProviderRecordsAsyncPort({
    controllerDataRoot: roots.controllerDataRoot,
    projectionRoot: roots.providerProjectionRoot,
    targetRecordsRoot: roots.providerTargetStateRoot,
  });
  return Object.freeze({
    records,
    projectionRepositoryRoot: roots.providerProjectionRoot,
  });
}
