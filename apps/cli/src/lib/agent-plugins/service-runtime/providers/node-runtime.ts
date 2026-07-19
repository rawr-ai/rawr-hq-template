import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import {
  createResourceCompleteTargetIdentityReader,
  type CompleteTargetIdentityReader,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import type { AgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records";
import { makeNodeAgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records/providers/effect-platform-node";

import { createNodeNativeProviderResource } from "../../bindings/providers";

type ProviderLifecycleDeps = Pick<
  Deps,
  | "providerRecords"
  | "providerArtifactRepository"
  | "providerNativeResource"
  | "providerExecutables"
  | "providerProjectionRepositoryRoot"
  | "providerEvidenceStore"
>;

export function createNodeProviderLifecycleDeps(options: Readonly<{
  state: NodeProviderRecordState;
  providerExecutables: ProviderLifecycleDeps["providerExecutables"];
  providerEvidenceStore: ProviderLifecycleDeps["providerEvidenceStore"];
}>): ProviderLifecycleDeps {
  return Object.freeze({
    providerRecords: options.state.records,
    providerArtifactRepository: options.state.artifactRepository,
    providerNativeResource: createNodeNativeProviderResource(),
    providerExecutables: options.providerExecutables,
    providerProjectionRepositoryRoot: options.state.projectionRepositoryRoot,
    providerEvidenceStore: options.providerEvidenceStore,
  });
}

export interface NodeProviderRecordRoots {
  readonly controllerDataRoot: string;
  readonly providerProjectionRoot: string;
  readonly providerTargetStateRoot: string;
}

export type NodeProviderRecordState = Readonly<{
  records: AgentProviderRecordsAsyncPort;
  artifactRepository: ArtifactRepositoryAsyncPort;
  projectionRepositoryRoot: string;
  /** Transitional task-5.3 bridge for export's known-native-home read. */
  exportKnownHomesReader: CompleteTargetIdentityReader;
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
  const artifactRepository = makeNodeArtifactRepositoryAsyncPort();
  const exportKnownHomesReader = createResourceCompleteTargetIdentityReader(records);
  return Object.freeze({
    records,
    artifactRepository,
    projectionRepositoryRoot: roots.providerProjectionRoot,
    exportKnownHomesReader,
  });
}
