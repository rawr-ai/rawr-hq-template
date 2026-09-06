import type { Client } from "@habitat-ai/agent-plugin-lifecycle-service/client";

type CleanWorkspace = Parameters<Client["releases"]["check"]>[0]["contentWorkspace"];
type StagedWorkspace = Extract<
  Parameters<Client["releases"]["checkRepository"]>[0],
  { kind: "staged" }
>["contentWorkspace"];

/** Native required/relationship validation supplies these fields before startup. */
export function required<T>(value: T | undefined): T {
  if (value === undefined)
    throw new TypeError("Native command admission omitted a required value.");
  return value;
}

type WorkspaceFlags = {
  readonly "content-workspace"?: string;
  readonly "repository-identity"?: CleanWorkspace["repositoryIdentity"];
  readonly "content-authority"?: CleanWorkspace["contentAuthority"];
  readonly "remote-name"?: string;
  readonly "remote-url"?: string;
  readonly ref?: string;
  readonly "release-input"?: CleanWorkspace["releaseInputPath"];
  readonly "plugin-root"?: CleanWorkspace["pluginRoot"];
  readonly "source-commit"?: CleanWorkspace["sourceCommit"];
  readonly "source-tree"?: CleanWorkspace["sourceTree"];
};

/** Projects admitted CLI values without observing or normalizing a workspace. */
export function stagedWorkspace(flags: WorkspaceFlags): StagedWorkspace {
  return {
    locator: required(flags["content-workspace"]),
    repositoryIdentity: required(flags["repository-identity"]),
    contentAuthority: required(flags["content-authority"]),
    remoteName: required(flags["remote-name"]),
    remoteUrl: required(flags["remote-url"]),
    refName: required(flags.ref),
    releaseInputPath: required(flags["release-input"]),
    pluginRoot: required(flags["plugin-root"]),
  };
}

/** Adds the explicit immutable Git binding required by clean-source operations. */
export function cleanWorkspace(flags: WorkspaceFlags): CleanWorkspace {
  return {
    ...stagedWorkspace(flags),
    sourceCommit: required(flags["source-commit"]),
    sourceTree: required(flags["source-tree"]),
  };
}

/** Adapts the separate current-main locator without selecting a channel or release. */
export function locator(
  flags: WorkspaceFlags
): Parameters<Client["providers"]["status"]>[0]["locator"] {
  return {
    workspacePath: required(flags["content-workspace"]),
    expectedRepositoryIdentity: required(flags["repository-identity"]),
  };
}

/** Projects only the caller-selected release mode. */
export function releaseMode(flags: {
  readonly plugin?: string;
  readonly "complete-set"?: boolean;
}): Parameters<Client["releases"]["check"]>[0]["mode"] {
  return flags["complete-set"] === true
    ? { kind: "complete-set" }
    : { kind: "targeted", pluginId: required(flags.plugin) };
}
