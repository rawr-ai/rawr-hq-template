import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  NodeQualifiedWritePort,
  executeAuthoringPlan,
  rejectedAuthoringResult,
  verifiedDestinationRoot,
  type AuthoringExecutionResult,
  type QualifiedWritePort,
  type VerifiedDestinationRoot,
} from "../shared";
import type { CuratedAgentPluginAuthoringRequest } from "./request";
import { curatedAgentPluginWritePlan } from "./template";

export const CONTENT_WORKSPACE_PROTOCOL = "rawr-agent-content-workspace@v1" as const;
const PERSONAL_ORIGIN = "https://github.com/rawr-ai/rawr-hq.git";
const OTHER_PLUGIN_ROOTS = Object.freeze([
  "plugins/cli",
  "plugins/web",
  "plugins/server/api",
  "plugins/async/workflows",
  "plugins/async/schedules",
]);

export type VerifiedContentWorkspaceV1 = Readonly<{
  protocol: typeof CONTENT_WORKSPACE_PROTOCOL;
  root: VerifiedDestinationRoot;
  repositoryIdentity: "rawr-ai/rawr-hq";
}>;

export type ContentWorkspaceVerifier = (
  contentWorkspace: string,
) => Promise<VerifiedContentWorkspaceV1>;

export async function authorCuratedAgentPlugin(
  request: CuratedAgentPluginAuthoringRequest,
  dependencies: Readonly<{
    verifyContentWorkspace?: ContentWorkspaceVerifier;
    port?: QualifiedWritePort;
  }> = {},
): Promise<AuthoringExecutionResult> {
  let workspace: VerifiedContentWorkspaceV1;
  try {
    workspace = await (dependencies.verifyContentWorkspace ?? verifyContentWorkspaceV1)(request.contentWorkspace);
  } catch (error) {
    return rejectedAuthoringResult([Object.freeze({
      code: "INVALID_DESTINATION",
      path: "contentWorkspace",
      message: errorMessage(error),
    })]);
  }

  try {
    await rejectDuplicatePluginLeaf(workspace.root, request.pluginId);
  } catch (error) {
    return rejectedAuthoringResult([Object.freeze({
      code: "IDENTITY_COLLISION",
      path: "id",
      message: errorMessage(error),
    })]);
  }

  return await executeAuthoringPlan({
    plan: curatedAgentPluginWritePlan(workspace.root, request),
    dryRun: request.dryRun,
    port: dependencies.port ?? new NodeQualifiedWritePort(),
  });
}

async function rejectDuplicatePluginLeaf(root: VerifiedDestinationRoot, pluginId: string): Promise<void> {
  for (const pluginRoot of OTHER_PLUGIN_ROOTS) {
    const candidate = path.join(root, ...pluginRoot.split("/"), pluginId);
    try {
      await fs.lstat(candidate);
      throw new Error(`Plugin leaf ${pluginId} already exists under ${pluginRoot}`);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
}

export async function verifyContentWorkspaceV1(contentWorkspace: string): Promise<VerifiedContentWorkspaceV1> {
  const requestedRoot = path.resolve(contentWorkspace);
  const gitRoot = path.resolve(gitText(requestedRoot, ["rev-parse", "--show-toplevel"]));
  const origin = gitText(gitRoot, ["remote", "get-url", "origin"]);
  const packageJson = JSON.parse(await fs.readFile(path.join(gitRoot, "package.json"), "utf8")) as { name?: unknown };
  if (gitRoot !== requestedRoot || origin !== PERSONAL_ORIGIN || packageJson.name !== "rawr-hq") {
    throw new Error("Curated agent-plugin authoring requires the exact personal content-workspace interface");
  }
  return Object.freeze({
    protocol: CONTENT_WORKSPACE_PROTOCOL,
    root: verifiedDestinationRoot(gitRoot),
    repositoryIdentity: "rawr-ai/rawr-hq",
  });
}

function gitText(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Content workspace must be a Git repository root");
  return result.stdout.trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
