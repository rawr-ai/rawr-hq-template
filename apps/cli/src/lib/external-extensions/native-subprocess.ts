import { spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import path from "node:path";

import type { ControllerRuntimeContext } from "../controller/runtime-context";
import {
  encodeNativeManagerInvocation,
  NATIVE_MANAGER_PROTOCOL_VERSION,
  validateNativeMutationRequest,
} from "./native-manager-protocol";
import {
  NativeMutationDispatchError,
  type NativeMutationCleanupSettlement,
  type NativeMutationDispatchResult,
  type NativeMutationPort,
  type NativeMutationRequest,
} from "./native-mutation";

export const NATIVE_MANAGER_ENTRY_RELATIVE_PATH = "dist/lib/external-extensions/native-manager-entry.js";
export const NATIVE_IMPORT_SANDBOX_RELATIVE_PATH = "dist/lib/external-extensions/native-import-sandbox.js";

const SCRUBBED_ENVIRONMENT_KEYS = Object.freeze([
  "BUN_OPTIONS",
  "BUN_CONFIG",
  "BUN_PRELOAD",
  "BUN_WORKSPACE",
  "BUN_INSTALL",
  "BUN_INSTALL_CACHE_DIR",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_REPL_EXTERNAL_MODULE",
  "NODE_CHANNEL_FD",
  "INIT_CWD",
  "npm_package_json",
  "npm_lifecycle_event",
  "npm_lifecycle_script",
]);
const NATIVE_MANAGER_TEMPORARY_PREFIX = "rawr-native-manager-";

export type NativeSubprocessInput = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  stdin: string;
}>;

export interface NativeSubprocessRunner {
  run(input: NativeSubprocessInput): Promise<void>;
}

export type NativePluginSubprocessOptions = Readonly<{
  runner?: NativeSubprocessRunner;
  temporaryParent?: string;
}>;

export class NativePluginSubprocessPort implements NativeMutationPort {
  private readonly runner: NativeSubprocessRunner;
  private readonly temporaryParent: string;
  private readonly nativeDataDir: string;

  constructor(
    private readonly context: Pick<
      ControllerRuntimeContext,
      "cliMemberRoot" | "cliRoot" | "dataRoot" | "digest" | "releaseRoot" | "runtimePath"
    >,
    nativeDataDir: string,
    options: NativePluginSubprocessOptions = {},
  ) {
    if (!path.isAbsolute(nativeDataDir) || path.normalize(nativeDataDir) !== nativeDataDir) {
      throw new Error("NATIVE_MANAGER_DATA_DIR_INVALID");
    }
    this.nativeDataDir = nativeDataDir;
    this.runner = options.runner ?? new NodeNativeSubprocessRunner();
    this.temporaryParent = path.resolve(options.temporaryParent ?? path.dirname(context.dataRoot));
  }

  async dispatch(request: NativeMutationRequest): Promise<NativeMutationDispatchResult> {
    validateNativeMutationRequest(request);

    const entryPath = await requireReleaseFile(
      this.context.releaseRoot,
      path.join(this.context.cliMemberRoot, NATIVE_MANAGER_ENTRY_RELATIVE_PATH),
    );
    const sandboxPath = await requireReleaseFile(
      this.context.releaseRoot,
      path.join(this.context.cliMemberRoot, NATIVE_IMPORT_SANDBOX_RELATIVE_PATH),
    );
    await mkdir(this.temporaryParent, { recursive: true });
    const canonicalTemporaryParent = await realpath(this.temporaryParent);
    const temporaryRoot = await realpath(
      await mkdtemp(path.join(canonicalTemporaryParent, NATIVE_MANAGER_TEMPORARY_PREFIX)),
    );
    const temporaryName = path.basename(temporaryRoot);

    let nativeError: unknown;
    try {
      const home = path.join(temporaryRoot, "home");
      const configHome = path.join(temporaryRoot, "config");
      const cacheHome = path.join(temporaryRoot, "cache");
      const temporaryDataHome = path.join(temporaryRoot, "data");
      const bin = path.join(temporaryRoot, "bin");
      const temporaryDirectory = path.join(temporaryRoot, "tmp");
      await Promise.all([
        mkdir(home),
        mkdir(configHome),
        mkdir(cacheHome),
        mkdir(temporaryDataHome),
        mkdir(bin),
        mkdir(temporaryDirectory),
      ]);
      await symlink(this.context.runtimePath, path.join(bin, process.platform === "win32" ? "node.exe" : "node"));

      const invocation = {
        protocolVersion: NATIVE_MANAGER_PROTOCOL_VERSION,
        cliRoot: this.context.cliRoot,
        nativeDataDir: this.nativeDataDir,
        request,
      } as const;
      const env = nativeManagerEnvironment({
        bin,
        cacheHome,
        configHome,
        controllerDigest: this.context.digest,
        home,
        nativeDataDir: this.nativeDataDir,
        releaseRoot: this.context.releaseRoot,
        temporaryDataHome,
        temporaryDirectory,
      });

      await this.runner.run({
        executable: this.context.runtimePath,
        args: [
          "--config=/dev/null",
          "--no-env-file",
          "--no-install",
          `--preload=${sandboxPath}`,
          entryPath,
        ],
        cwd: this.context.releaseRoot,
        env,
        stdin: encodeNativeManagerInvocation(invocation),
      });
    } catch (error) {
      nativeError = error;
    }

    let cleanup: NativeMutationCleanupSettlement;
    try {
      await removeNativeManagerTemporaryRoot(
        canonicalTemporaryParent,
        temporaryRoot,
        temporaryName,
      );
      cleanup = Object.freeze({ owner: "native-manager-temporary", status: "completed" });
    } catch (error) {
      cleanup = Object.freeze({
        owner: "native-manager-temporary",
        status: "failed",
        error: errorMessage(error),
      });
    }
    if (nativeError !== undefined) throw new NativeMutationDispatchError(nativeError, cleanup);
    return Object.freeze({ cleanup });
  }
}

async function removeNativeManagerTemporaryRoot(
  parent: string,
  temporaryRoot: string,
  expectedName: string,
): Promise<void> {
  const normalizedParent = path.resolve(parent);
  const normalizedRoot = path.resolve(temporaryRoot);
  const parentStatus = await lstat(normalizedParent);
  if (
    !parentStatus.isDirectory()
    || parentStatus.isSymbolicLink()
    || await realpath(normalizedParent) !== normalizedParent
  ) {
    throw new Error(`refusing invalid native-manager temporary parent: ${parent}`);
  }
  if (
    path.dirname(normalizedRoot) !== normalizedParent
    || path.basename(normalizedRoot) !== expectedName
    || !expectedName.startsWith(NATIVE_MANAGER_TEMPORARY_PREFIX)
  ) {
    throw new Error(`refusing unowned native-manager temporary root: ${temporaryRoot}`);
  }

  let status;
  try {
    status = await lstat(normalizedRoot);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw new Error(`refusing aliased native-manager temporary root: ${temporaryRoot}`);
  }
  if (await realpath(normalizedRoot) !== normalizedRoot) {
    throw new Error(`refusing noncanonical native-manager temporary root: ${temporaryRoot}`);
  }
  await rm(normalizedRoot, { recursive: true });
}

export class NodeNativeSubprocessRunner implements NativeSubprocessRunner {
  async run(input: NativeSubprocessInput): Promise<void> {
    await new Promise<void>((resolveProcess, rejectProcess) => {
      const child = spawn(input.executable, [...input.args], {
        cwd: input.cwd,
        env: { ...input.env },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stderr = "";
      child.stdout?.resume();
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
        stderr = `${stderr}${chunk.toString("utf8")}`.slice(-16 * 1024);
      });
      let spawnError: Error | undefined;
      let stdinError: Error | undefined;
      child.once("error", (error) => {
        spawnError = error;
      });
      child.once("close", (code, signal) => {
        if (spawnError !== undefined) {
          rejectProcess(spawnError);
        } else if (stdinError !== undefined) {
          rejectProcess(stdinError);
        } else if (code === 0) {
          resolveProcess();
        } else {
          rejectProcess(new Error(
          `NATIVE_MANAGER_SUBPROCESS_FAILED:${signal ?? String(code)}${stderr ? `:${stderr.trim()}` : ""}`,
          ));
        }
      });
      child.stdin?.once("error", (error) => {
        stdinError = error;
        if (child.exitCode === null && child.signalCode === null) child.kill();
      });
      child.stdin?.end(input.stdin, "utf8");
    });
  }
}

export function nativeManagerEnvironment(input: {
  bin: string;
  cacheHome: string;
  configHome: string;
  controllerDigest: string;
  home: string;
  nativeDataDir: string;
  releaseRoot: string;
  temporaryDataHome: string;
  temporaryDirectory: string;
}): Readonly<Record<string, string>> {
  const env: Record<string, string> = {
    PATH: `${input.bin}${path.delimiter}/usr/bin${path.delimiter}/bin`,
    HOME: input.home,
    XDG_CONFIG_HOME: input.configHome,
    XDG_CACHE_HOME: input.cacheHome,
    XDG_DATA_HOME: input.temporaryDataHome,
    TMPDIR: input.temporaryDirectory,
    RAWR_DATA_DIR: input.nativeDataDir,
    RAWR_CONFIG_DIR: input.configHome,
    RAWR_CACHE_DIR: input.cacheHome,
    RAWR_CONTROLLER_DIGEST: input.controllerDigest,
    RAWR_CONTROLLER_RELEASE_ROOT: input.releaseRoot,
    RAWR_NATIVE_MANAGER_SANDBOX: "1",
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    BUN_CONFIG_IGNORE_SCRIPTS: "1",
    npm_config_ignore_scripts: "true",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
    npm_config_cache: path.join(input.cacheHome, "npm"),
    npm_config_userconfig: "/dev/null",
    npm_config_globalconfig: "/dev/null",
    HUSKY: "0",
    CI: "1",
    NO_COLOR: "1",
    NODE_ENV: "production",
    LANG: "C",
  };
  for (const key of SCRUBBED_ENVIRONMENT_KEYS) delete env[key];
  return Object.freeze(env);
}

async function requireReleaseFile(releaseRoot: string, requestedPath: string): Promise<string> {
  const entry = await lstat(requestedPath);
  if (!entry.isFile() || entry.nlink !== 1) throw new Error("NATIVE_MANAGER_RELEASE_FILE_INVALID");
  const canonicalReleaseRoot = await realpath(releaseRoot);
  const canonicalPath = await realpath(requestedPath);
  if (!isContained(canonicalReleaseRoot, requestedPath) || !isContained(canonicalReleaseRoot, canonicalPath)) {
    throw new Error("NATIVE_MANAGER_RELEASE_FILE_OUTSIDE_CONTROLLER");
  }
  return canonicalPath;
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function isMissing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
