import { Config } from "@oclif/core";
import { commands } from "@oclif/plugin-plugins";
import { realpath } from "node:fs/promises";
import path from "node:path";

import {
  decodeNativeManagerInvocation,
  type NativeManagerInvocation,
  validateNativeManagerInvocation,
  verifyInspectedInstallArtifact,
} from "./native-manager-protocol";

type NativeManagerCommand = Readonly<{
  run(argv: string[], config: Config): Promise<unknown>;
}>;

export type NativeManagerEntryDependencies = Readonly<{
  loadConfig(options: Parameters<typeof Config.load>[0]): Promise<Config>;
  commands: Readonly<Record<string, NativeManagerCommand | undefined>>;
}>;

const DEFAULT_DEPENDENCIES: NativeManagerEntryDependencies = Object.freeze({
  loadConfig: (options: Parameters<typeof Config.load>[0]) => Config.load(options),
  commands,
});

export async function executeNativeManagerInvocation(
  invocation: NativeManagerInvocation,
  dependencies: NativeManagerEntryDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  validateNativeManagerInvocation(invocation);
  const releaseRoot = requiredEnvironment("RAWR_CONTROLLER_RELEASE_ROOT");
  await requireControllerCliRoot(releaseRoot, invocation.cliRoot);
  await verifyInspectedInstallArtifact(invocation.request);

  const config = await dependencies.loadConfig({
    root: invocation.cliRoot,
    userPlugins: false,
    devPlugins: false,
    jitPlugins: false,
  });
  if (path.resolve(config.dataDir) !== invocation.nativeDataDir) {
    throw new Error("NATIVE_MANAGER_DATA_DIR_MISMATCH");
  }

  const command = dependencies.commands[invocation.request.commandExport];
  if (command === undefined) throw new Error("NATIVE_MANAGER_PUBLIC_COMMAND_UNAVAILABLE");
  await command.run([...invocation.request.argv], config);
}

export async function runNativeManagerEntry(): Promise<void> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > 64 * 1024) throw new Error("NATIVE_MANAGER_REQUEST_TOO_LARGE");
    chunks.push(bytes);
  }
  const invocation = decodeNativeManagerInvocation(Buffer.concat(chunks).toString("utf8"));
  await executeNativeManagerInvocation(invocation);
}

async function requireControllerCliRoot(releaseRoot: string, cliRoot: string): Promise<void> {
  const canonicalRelease = await realpath(releaseRoot);
  const canonicalCli = await realpath(cliRoot);
  if (!isContained(canonicalRelease, cliRoot) || !isContained(canonicalRelease, canonicalCli)) {
    throw new Error("NATIVE_MANAGER_CLI_ROOT_OUTSIDE_CONTROLLER");
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`NATIVE_MANAGER_ENV_REQUIRED:${name}`);
  return value;
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

if (import.meta.main) {
  try {
    await runNativeManagerEntry();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
