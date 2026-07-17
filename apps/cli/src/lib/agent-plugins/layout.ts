import path from "node:path";

import type { ControllerRuntimeContext } from "../controller/runtime-context";

export type ArtifactStoreRoot = string & {
  readonly __artifactStoreRoot: "ArtifactStoreRootV1";
};

export type CapsuleRoot = string & {
  readonly __capsuleRoot: "CapsuleRootV1";
};

export type ProviderProjectionRoot = string & {
  readonly __providerProjectionRoot: "ProviderProjectionRootV1";
};

export type ProviderTargetStateRoot = string & {
  readonly __providerTargetStateRoot: "ProviderTargetStateRootV1";
};

export type AgentPluginControllerLayout = Readonly<{
  artifactStoreRoot: ArtifactStoreRoot;
  capsuleRoot: CapsuleRoot;
  providerProjectionRoot: ProviderProjectionRoot;
  providerTargetStateRoot: ProviderTargetStateRoot;
}>;

const AGENT_PLUGIN_STATE_DIRECTORY = "agent-plugins";
const ARTIFACT_STORE_DIRECTORY = "artifacts-v1";
const CAPSULE_DIRECTORY = "last-operation-v1";
const PROVIDER_PROJECTION_DIRECTORY = "provider-projections-v1";
const PROVIDER_TARGET_STATE_DIRECTORY = "provider-target-state-v1";

export function deriveAgentPluginControllerLayout(
  context: Pick<ControllerRuntimeContext, "dataRoot">,
): AgentPluginControllerLayout {
  const dataRoot = requireCanonicalAbsoluteRoot(context.dataRoot);
  const ownerRoot = path.join(dataRoot, AGENT_PLUGIN_STATE_DIRECTORY);
  const artifactStoreRoot = path.join(ownerRoot, ARTIFACT_STORE_DIRECTORY);
  const capsuleRoot = path.join(ownerRoot, CAPSULE_DIRECTORY);
  const providerProjectionRoot = path.join(ownerRoot, PROVIDER_PROJECTION_DIRECTORY);
  const providerTargetStateRoot = path.join(ownerRoot, PROVIDER_TARGET_STATE_DIRECTORY);

  if (
    !isContained(dataRoot, artifactStoreRoot)
    || !isContained(dataRoot, capsuleRoot)
    || !isContained(dataRoot, providerProjectionRoot)
    || !isContained(dataRoot, providerTargetStateRoot)
  ) {
    throw new Error("AGENT_PLUGIN_LAYOUT_OUTSIDE_CONTROLLER_DATA_ROOT");
  }

  return Object.freeze({
    artifactStoreRoot: artifactStoreRoot as ArtifactStoreRoot,
    capsuleRoot: capsuleRoot as CapsuleRoot,
    providerProjectionRoot: providerProjectionRoot as ProviderProjectionRoot,
    providerTargetStateRoot: providerTargetStateRoot as ProviderTargetStateRoot,
  });
}

function requireCanonicalAbsoluteRoot(value: string): string {
  if (!path.isAbsolute(value) || path.normalize(value) !== value || path.resolve(value) !== value) {
    throw new Error("AGENT_PLUGIN_CONTROLLER_DATA_ROOT_INVALID");
  }
  return value;
}

function isContained(root: string, candidate: string): boolean {
  const offset = path.relative(root, candidate);
  return offset !== ""
    && offset !== ".."
    && !offset.startsWith(`..${path.sep}`)
    && !path.isAbsolute(offset);
}
