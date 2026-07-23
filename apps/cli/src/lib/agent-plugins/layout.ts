import path from "node:path";

export type ArtifactStoreRoot = string & {
  readonly __artifactStoreRoot: "ArtifactStoreRootV1";
};

export type AgentPluginControllerLayout = Readonly<{
  artifactStoreRoot: ArtifactStoreRoot;
}>;

const AGENT_PLUGIN_STATE_DIRECTORY = "agent-plugins";
const ARTIFACT_STORE_DIRECTORY = "artifacts-v1";

export function deriveAgentPluginControllerLayout(
  context: Readonly<{ dataRoot: string }>
): AgentPluginControllerLayout {
  const dataRoot = requireCanonicalAbsoluteRoot(context.dataRoot);
  const ownerRoot = path.join(dataRoot, AGENT_PLUGIN_STATE_DIRECTORY);
  const artifactStoreRoot = path.join(ownerRoot, ARTIFACT_STORE_DIRECTORY);

  if (!isContained(dataRoot, artifactStoreRoot)) {
    throw new Error("AGENT_PLUGIN_LAYOUT_OUTSIDE_CONTROLLER_DATA_ROOT");
  }

  return Object.freeze({
    artifactStoreRoot: artifactStoreRoot as ArtifactStoreRoot,
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
  return (
    offset !== "" &&
    offset !== ".." &&
    !offset.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(offset)
  );
}
