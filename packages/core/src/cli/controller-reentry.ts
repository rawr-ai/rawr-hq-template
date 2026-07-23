import { isAbsolute, normalize } from "node:path";

export type ControllerReentry = Readonly<{
  cmd: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}>;

export type ControllerReentryAuthority = Readonly<{
  runtimePath: string;
  entryPath: string;
  releaseRoot: string;
  dataRoot: string;
  controllerDigest: string;
  operatorCwd: string;
  operatorHome: string | undefined;
  operatorConfigHome: string | undefined;
}>;

const BUN_REENTRY_FLAGS = Object.freeze(["--config=/dev/null", "--no-env-file", "--no-install"]);

let verifiedAuthority: ControllerReentryAuthority | undefined;

export function bindVerifiedControllerReentryAuthority(input: ControllerReentryAuthority): void {
  const authority = validateAuthority(input);
  if (verifiedAuthority !== undefined) {
    throw new Error("CONTROLLER_REENTRY_AUTHORITY_ALREADY_BOUND");
  }
  verifiedAuthority = authority;
}

export function resolveControllerReentry(): ControllerReentry {
  const authority = verifiedAuthority;
  if (authority === undefined) throw new Error("CONTROLLER_REENTRY_AUTHORITY_REQUIRED");
  const env = { ...process.env };
  for (const name of [
    "BUN_CONFIG",
    "BUN_INSTALL",
    "BUN_INSTALL_CACHE_DIR",
    "BUN_OPTIONS",
    "BUN_PRELOAD",
    "BUN_WORKSPACE",
    "NODE_OPTIONS",
    "NODE_PATH",
  ])
    delete env[name];
  Object.assign(env, {
    HOME: "/dev/null",
    XDG_CONFIG_HOME: "/dev/null",
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    RAWR_DATA_DIR: authority.dataRoot,
    RAWR_CONTROLLER_DIGEST: authority.controllerDigest,
    RAWR_CONTROLLER_RELEASE_ROOT: authority.releaseRoot,
    RAWR_OPERATOR_CWD: authority.operatorCwd,
    RAWR_OPERATOR_HOME: authority.operatorHome ?? "",
    RAWR_OPERATOR_HOME_SET: authority.operatorHome === undefined ? "0" : "1",
    RAWR_OPERATOR_XDG_CONFIG_HOME: authority.operatorConfigHome ?? "",
    RAWR_OPERATOR_XDG_CONFIG_HOME_SET: authority.operatorConfigHome === undefined ? "0" : "1",
  });
  return Object.freeze({
    cmd: authority.runtimePath,
    args: Object.freeze([...BUN_REENTRY_FLAGS, authority.entryPath]),
    cwd: authority.releaseRoot,
    env,
  });
}

function validateAuthority(input: ControllerReentryAuthority): ControllerReentryAuthority {
  if (!/^[0-9a-f]{64}$/u.test(input.controllerDigest)) {
    throw new Error("CONTROLLER_REENTRY_DIGEST_INVALID");
  }
  return Object.freeze({
    runtimePath: normalizeAbsolute(input.runtimePath, "runtime path"),
    entryPath: normalizeAbsolute(input.entryPath, "entry path"),
    releaseRoot: normalizeAbsolute(input.releaseRoot, "release root"),
    dataRoot: normalizeAbsolute(input.dataRoot, "data root"),
    controllerDigest: input.controllerDigest,
    operatorCwd: normalizeAbsolute(input.operatorCwd, "operator cwd"),
    operatorHome: input.operatorHome,
    operatorConfigHome: input.operatorConfigHome,
  });
}

function normalizeAbsolute(value: string, label: string): string {
  if (!isAbsolute(value) || normalize(value) !== value) {
    throw new Error(`CONTROLLER_REENTRY_${label.toUpperCase().replaceAll(" ", "_")}_INVALID`);
  }
  return value;
}
