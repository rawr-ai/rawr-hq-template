import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ControllerPayloadManifest } from "@rawr/controller-release";

import {
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerDataRootFromRelease,
  controllerLauncherPath,
  controllerReleasePath,
  controllerSelectorPath,
} from "./layout";
import {
  requireVerifiedControllerRelease,
  type VerifiedControllerRelease,
} from "./release-inspector";

const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;

export type ControllerOperatorContext = Readonly<{
  cwd: string;
  home: string | undefined;
  xdgConfigHome: string | undefined;
}>;

export type ControllerRuntimeContext = Readonly<{
  digest: string;
  dataRoot: string;
  releaseRoot: string;
  cliRoot: string;
  cliMemberRoot: string;
  selectorPath: string;
  stableLauncherPath: string;
  runtimePath: string;
  entryPath: string;
  manifest: ControllerPayloadManifest;
  verifiedRelease: VerifiedControllerRelease;
  operator: ControllerOperatorContext;
}>;

export async function loadControllerRuntimeContext(input: {
  entryUrl: string | URL;
  env?: NodeJS.ProcessEnv;
  observedExecPath?: string;
  observedCwd?: string;
}): Promise<ControllerRuntimeContext> {
  const env = input.env ?? process.env;
  const digest = requiredEnvironment(env, "RAWR_CONTROLLER_DIGEST");
  if (!DIGEST_PATTERN.test(digest)) throw new Error("CONTROLLER_DIGEST_INVALID");

  const releaseRoot = path.resolve(requiredEnvironment(env, "RAWR_CONTROLLER_RELEASE_ROOT"));
  const dataRoot = controllerDataRootFromRelease(releaseRoot);
  if (releaseRoot !== controllerReleasePath(dataRoot, digest)) {
    throw new Error("CONTROLLER_RELEASE_CONTEXT_INVALID");
  }
  if (path.resolve(input.observedCwd ?? process.cwd()) !== releaseRoot) {
    throw new Error("CONTROLLER_STARTUP_CWD_INVALID");
  }

  const entryPath = path.join(releaseRoot, CONTROLLER_ENTRY_PATH);
  const loadedEntryPath = path.resolve(fileURLToPath(input.entryUrl));
  if ((await realpath(loadedEntryPath)) !== (await realpath(entryPath))) {
    throw new Error("CONTROLLER_ENTRY_CONTEXT_INVALID");
  }

  const runtimePath = path.join(releaseRoot, CONTROLLER_RUNTIME_PATH);
  const observedExecPath = path.resolve(input.observedExecPath ?? process.execPath);
  if ((await realpath(observedExecPath)) !== (await realpath(runtimePath))) {
    throw new Error("CONTROLLER_RUNTIME_CONTEXT_INVALID");
  }

  const verifiedRelease = await requireVerifiedControllerRelease({
    releaseRoot,
    expectedDigest: digest,
  });
  const cliMember = verifiedRelease.envelope.manifest.officialMembers.find(
    (member) => member.packageId === "@rawr/cli"
  );
  if (cliMember === undefined) throw new Error("CONTROLLER_CLI_MEMBER_REQUIRED");
  const cliMemberRoot = path.resolve(releaseRoot, cliMember.root);
  const canonicalCliMemberRoot = await realpath(cliMemberRoot);
  if (
    !isContained(releaseRoot, cliMemberRoot) ||
    !isContained(releaseRoot, canonicalCliMemberRoot) ||
    !(await lstat(canonicalCliMemberRoot)).isDirectory()
  ) {
    throw new Error("CONTROLLER_CLI_MEMBER_CONTEXT_INVALID");
  }
  const operator = readOperatorContext(env);

  return Object.freeze({
    digest,
    dataRoot,
    releaseRoot,
    cliRoot: path.join(releaseRoot, "app"),
    cliMemberRoot: canonicalCliMemberRoot,
    selectorPath: controllerSelectorPath(dataRoot),
    stableLauncherPath: controllerLauncherPath(dataRoot),
    runtimePath,
    entryPath,
    manifest: verifiedRelease.envelope.manifest,
    verifiedRelease,
    operator,
  });
}

function isContained(root: string, candidate: string): boolean {
  const offset = path.relative(root, candidate);
  return (
    offset === "" ||
    (!offset.startsWith(`..${path.sep}`) && offset !== ".." && !path.isAbsolute(offset))
  );
}

export function restoreControllerOperatorContext(
  context: ControllerOperatorContext,
  env: NodeJS.ProcessEnv = process.env
): void {
  process.chdir(context.cwd);
  assignOptionalEnvironment(env, "HOME", context.home);
  assignOptionalEnvironment(env, "XDG_CONFIG_HOME", context.xdgConfigHome);
  for (const key of [
    "RAWR_OPERATOR_CWD",
    "RAWR_OPERATOR_HOME",
    "RAWR_OPERATOR_HOME_SET",
    "RAWR_OPERATOR_XDG_CONFIG_HOME",
    "RAWR_OPERATOR_XDG_CONFIG_HOME_SET",
  ]) {
    delete env[key];
  }
}

function readOperatorContext(env: NodeJS.ProcessEnv): ControllerOperatorContext {
  const cwd = path.resolve(requiredEnvironment(env, "RAWR_OPERATOR_CWD"));
  const home = capturedEnvironment(env, "HOME");
  const xdgConfigHome = capturedEnvironment(env, "XDG_CONFIG_HOME");
  return Object.freeze({ cwd, home, xdgConfigHome });
}

function capturedEnvironment(
  env: NodeJS.ProcessEnv,
  name: "HOME" | "XDG_CONFIG_HOME"
): string | undefined {
  const set = requiredEnvironment(env, `RAWR_OPERATOR_${name}_SET`);
  if (set === "0") return undefined;
  if (set !== "1") throw new Error(`CONTROLLER_OPERATOR_${name}_INVALID`);
  return env[`RAWR_OPERATOR_${name}`] ?? "";
}

function requiredEnvironment(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.length === 0)
    throw new Error(`CONTROLLER_RELEASE_REQUIRED:${name}`);
  return value;
}

function assignOptionalEnvironment(
  env: NodeJS.ProcessEnv,
  name: string,
  value: string | undefined
): void {
  if (value === undefined) delete env[name];
  else env[name] = value;
}
