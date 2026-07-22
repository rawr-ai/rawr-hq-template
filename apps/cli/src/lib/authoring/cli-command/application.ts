import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  type AuthoringExecutionResult,
  executeAuthoringPlan,
  NodeQualifiedWritePort,
  type QualifiedWritePort,
  rejectedAuthoringResult,
  type VerifiedDestinationRoot,
  verifiedDestinationRoot,
} from "../shared";
import type { OfficialCommandAuthoringRequest } from "./request";
import { officialCommandWritePlan } from "./template";

const TEMPLATE_ORIGIN = "https://github.com/rawr-ai/rawr-hq-template.git";

export type OfficialCommandWorkspaceVerifier = (cwd: string) => Promise<VerifiedDestinationRoot>;

export async function authorOfficialCommand(
  request: OfficialCommandAuthoringRequest,
  dependencies: Readonly<{
    verifyWorkspace?: OfficialCommandWorkspaceVerifier;
    port?: QualifiedWritePort;
  }> = {}
): Promise<AuthoringExecutionResult> {
  try {
    const root = await (dependencies.verifyWorkspace ?? verifyOfficialCommandTemplateWorkspace)(
      request.workspaceCwd
    );
    return await executeAuthoringPlan({
      plan: officialCommandWritePlan(root, request),
      dryRun: request.dryRun,
      port: dependencies.port ?? new NodeQualifiedWritePort(),
    });
  } catch (error) {
    return rejectedAuthoringResult([
      Object.freeze({
        code: "INVALID_DESTINATION",
        path: "workspace",
        message: errorMessage(error),
      }),
    ]);
  }
}

export async function verifyOfficialCommandTemplateWorkspace(
  cwd: string
): Promise<VerifiedDestinationRoot> {
  const root = gitText(cwd, ["rev-parse", "--show-toplevel"]);
  const origin = gitText(root, ["remote", "get-url", "origin"]);
  const rootPackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")) as {
    name?: unknown;
  };
  const cliPackage = JSON.parse(
    await fs.readFile(path.join(root, "apps", "cli", "package.json"), "utf8")
  ) as { name?: unknown };
  if (
    origin !== TEMPLATE_ORIGIN ||
    rootPackage.name !== "rawr-hq-template" ||
    cliPackage.name !== "@rawr/cli"
  ) {
    throw new Error("Official command authoring requires the exact RAWR HQ-Template workspace");
  }
  return verifiedDestinationRoot(path.resolve(root));
}

function gitText(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Official command authoring requires a Git workspace");
  return result.stdout.trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
