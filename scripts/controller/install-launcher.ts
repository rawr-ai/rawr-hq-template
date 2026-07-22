import { constants } from "node:fs";
import { lstat, mkdir, readFile, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertCanonicalContainedParent,
  atomicWriteFile,
  ensureCanonicalContainedDirectory,
  type AtomicWriteObserver,
} from "./lib/filesystem.ts";
import { controllerLauncherPath } from "./layout.ts";

export type LauncherInstallResult =
  | Readonly<{
      kind: "installed";
      path: string;
      durability: "confirmed" | "unconfirmed";
      postCommitError?: string;
    }>
  | Readonly<{
      kind: "converged";
      path: string;
      durability: "unchanged";
    }>
  | Readonly<{
      kind: "drifted";
      path: string;
      durability: "unchanged";
      reason: "missing" | "not-regular" | "shared-inode" | "not-executable" | "bytes-mismatch";
    }>;

const sourceLauncherPath = join(dirname(fileURLToPath(import.meta.url)), "stable-launcher.sh");

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

export async function installStableControllerLauncher(options: {
  dataRoot: string;
  sourcePath?: string;
  observe?: AtomicWriteObserver;
}): Promise<LauncherInstallResult> {
  const sourcePath = options.sourcePath ?? sourceLauncherPath;
  await mkdir(options.dataRoot, { recursive: true });
  const dataRoot = await realpath(options.dataRoot);
  const destination = controllerLauncherPath(dataRoot);
  await ensureCanonicalContainedDirectory(
    dataRoot,
    dirname(destination),
    "stable controller launcher parent"
  );
  const sourceBytes = new Uint8Array(await readFile(sourcePath));

  try {
    const status = await lstat(destination);
    if (
      status.isFile() &&
      status.nlink === 1 &&
      (status.mode & constants.S_IXUSR) !== 0 &&
      status.size === sourceBytes.byteLength &&
      sameBytes(new Uint8Array(await readFile(destination)), sourceBytes)
    ) {
      return Object.freeze({ kind: "converged", path: destination, durability: "unchanged" });
    }
  } catch (error) {
    if (
      !(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }

  const replacement = await atomicWriteFile(
    dataRoot,
    destination,
    sourceBytes,
    0o755,
    options.observe
  );
  return replacement.durability === "confirmed"
    ? Object.freeze({ kind: "installed", path: destination, durability: "confirmed" })
    : Object.freeze({
        kind: "installed",
        path: destination,
        durability: "unconfirmed",
        postCommitError: errorMessage(replacement.postCommitError),
      });
}

export async function inspectStableControllerLauncher(options: {
  dataRoot: string;
  sourcePath?: string;
}): Promise<LauncherInstallResult> {
  const dataRoot = await realpath(options.dataRoot);
  const destination = controllerLauncherPath(dataRoot);
  await assertCanonicalContainedParent(dataRoot, destination, "stable controller launcher");
  const sourceBytes = new Uint8Array(await readFile(options.sourcePath ?? sourceLauncherPath));
  try {
    const status = await lstat(destination);
    if (!status.isFile()) return drifted(destination, "not-regular");
    if (status.nlink !== 1) return drifted(destination, "shared-inode");
    if ((status.mode & constants.S_IXUSR) === 0) return drifted(destination, "not-executable");
    if (status.size !== sourceBytes.byteLength) return drifted(destination, "bytes-mismatch");
    if (!sameBytes(new Uint8Array(await readFile(destination)), sourceBytes)) {
      return drifted(destination, "bytes-mismatch");
    }
    return Object.freeze({ kind: "converged", path: destination, durability: "unchanged" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return drifted(destination, "missing");
    }
    throw error;
  }
}

function drifted(
  path: string,
  reason: Extract<LauncherInstallResult, { kind: "drifted" }>["reason"]
): LauncherInstallResult {
  return Object.freeze({ kind: "drifted", path, durability: "unchanged", reason });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
