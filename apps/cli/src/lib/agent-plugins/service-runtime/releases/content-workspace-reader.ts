import type { ContentWorkspaceSnapshotReader } from "@rawr/agent-plugin-lifecycle/ports/releases";

import { createGitObjectSnapshotReader } from "./git/object-snapshot";
import { createGitCommandRunner } from "./git/process";

export interface GitContentWorkspaceSnapshotReaderConfig {
  readonly gitExecutable: string;
  readonly pathEnvironment?: string;
}

export async function createGitContentWorkspaceSnapshotReader(
  config: GitContentWorkspaceSnapshotReaderConfig,
): Promise<ContentWorkspaceSnapshotReader> {
  assertExactConfig(config);
  const runner = await createGitCommandRunner({
    gitExecutable: config.gitExecutable,
    ...(config.pathEnvironment === undefined ? {} : { pathEnvironment: config.pathEnvironment }),
  });
  return createGitObjectSnapshotReader(runner);
}

function assertExactConfig(config: GitContentWorkspaceSnapshotReaderConfig): void {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Git content-workspace reader config must be an object");
  }
  const allowed = new Set(["gitExecutable", "pathEnvironment"]);
  const unknown = Object.keys(config).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Git content-workspace reader config contains unknown fields: ${unknown.sort().join(",")}`);
  }
  if (typeof config.gitExecutable !== "string") {
    throw new Error("Git content-workspace reader config requires a Git executable path");
  }
  if (config.pathEnvironment !== undefined && typeof config.pathEnvironment !== "string") {
    throw new Error("Git content-workspace reader PATH config must be a string");
  }
}
