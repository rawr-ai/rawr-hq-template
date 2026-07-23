import { randomUUID } from "node:crypto";
import { lstat, mkdir, readlink, rename, rm, symlink } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { fsyncDirectory } from "../lib/filesystem.ts";

export type GlobalAliasInstallResult =
  | Readonly<{
      kind: "installed";
      path: string;
      target: string;
      durability: "confirmed" | "unconfirmed";
      postCommitError?: string;
    }>
  | Readonly<{
      kind: "converged";
      path: string;
      target: string;
      durability: "unchanged";
    }>
  | Readonly<{
      kind: "drifted";
      path: string;
      target: string;
      durability: "unchanged";
      reason: "missing" | "not-symlink" | "target-mismatch";
    }>
  | Readonly<{
      kind: "failed";
      path: string;
      target: string;
      durability: "unchanged";
      error: string;
    }>;

export type GlobalAliasPreparation =
  | Readonly<{
      kind: "converged";
      result: Extract<GlobalAliasInstallResult, { kind: "converged" }>;
    }>
  | Readonly<{
      kind: "prepared";
      path: string;
      target: string;
      temporaryPath: string;
    }>;

export type GlobalAliasWritePhase = "before-replace" | "before-commit" | "after-replace";
export type GlobalAliasWriteObserver = (phase: GlobalAliasWritePhase) => void | Promise<void>;

export async function installGlobalControllerAlias(options: {
  globalBinDir: string;
  launcherPath: string;
  observe?: GlobalAliasWriteObserver;
}): Promise<GlobalAliasInstallResult> {
  const prepared = await prepareGlobalControllerAlias(options);
  return await commitPreparedGlobalControllerAlias(prepared, options.observe);
}

export async function prepareGlobalControllerAlias(options: {
  globalBinDir: string;
  launcherPath: string;
  observe?: GlobalAliasWriteObserver;
}): Promise<GlobalAliasPreparation> {
  if (!isAbsolute(options.globalBinDir) || !isAbsolute(options.launcherPath)) {
    throw new Error("global controller alias paths must be absolute");
  }
  await mkdir(options.globalBinDir, { recursive: true });
  const destination = join(options.globalBinDir, "rawr");
  try {
    const status = await lstat(destination);
    if (status.isSymbolicLink()) {
      const currentTarget = await readlink(destination);
      if (resolve(dirname(destination), currentTarget) === options.launcherPath) {
        return Object.freeze({
          kind: "converged" as const,
          result: Object.freeze({
            kind: "converged" as const,
            path: destination,
            target: options.launcherPath,
            durability: "unchanged" as const,
          }),
        });
      }
    } else {
      throw new Error(`global rawr path is not a replaceable symlink: ${destination}`);
    }
  } catch (error) {
    if (
      !(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }

  const temporary = `${destination}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await symlink(options.launcherPath, temporary);
    await options.observe?.("before-replace");
  } catch (primaryError) {
    try {
      await rm(temporary, { force: true });
    } catch (cleanupError) {
      throw new AggregateError(
        [primaryError, cleanupError],
        "global alias preparation failed and temporary cleanup also failed"
      );
    }
    throw primaryError;
  }
  return Object.freeze({
    kind: "prepared",
    path: destination,
    target: options.launcherPath,
    temporaryPath: temporary,
  });
}

export async function abortPreparedGlobalControllerAlias(
  prepared: GlobalAliasPreparation
): Promise<void> {
  if (prepared.kind === "prepared") await rm(prepared.temporaryPath, { force: true });
}

export async function commitPreparedGlobalControllerAlias(
  prepared: GlobalAliasPreparation,
  observe?: GlobalAliasWriteObserver
): Promise<GlobalAliasInstallResult> {
  if (prepared.kind === "converged") return prepared.result;
  try {
    await observe?.("before-commit");
    await rename(prepared.temporaryPath, prepared.path);
  } catch (error) {
    try {
      await rm(prepared.temporaryPath, { force: true });
    } catch (cleanupError) {
      return Object.freeze({
        kind: "failed",
        path: prepared.path,
        target: prepared.target,
        durability: "unchanged",
        error: `${errorMessage(error)}; temporary cleanup failed: ${errorMessage(cleanupError)}`,
      });
    }
    return Object.freeze({
      kind: "failed",
      path: prepared.path,
      target: prepared.target,
      durability: "unchanged",
      error: errorMessage(error),
    });
  }
  try {
    await observe?.("after-replace");
    await fsyncDirectory(dirname(prepared.path));
  } catch (postCommitError) {
    return Object.freeze({
      kind: "installed",
      path: prepared.path,
      target: prepared.target,
      durability: "unconfirmed",
      postCommitError: errorMessage(postCommitError),
    });
  }
  return Object.freeze({
    kind: "installed",
    path: prepared.path,
    target: prepared.target,
    durability: "confirmed",
  });
}

export async function inspectGlobalControllerAlias(options: {
  globalBinDir: string;
  launcherPath: string;
}): Promise<GlobalAliasInstallResult> {
  if (!isAbsolute(options.globalBinDir) || !isAbsolute(options.launcherPath)) {
    throw new Error("global controller alias paths must be absolute");
  }
  const destination = join(options.globalBinDir, "rawr");
  try {
    const status = await lstat(destination);
    if (!status.isSymbolicLink()) return drifted(destination, options.launcherPath, "not-symlink");
    const currentTarget = await readlink(destination);
    return resolve(dirname(destination), currentTarget) === options.launcherPath
      ? Object.freeze({
          kind: "converged",
          path: destination,
          target: options.launcherPath,
          durability: "unchanged",
        })
      : drifted(destination, options.launcherPath, "target-mismatch");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return drifted(destination, options.launcherPath, "missing");
    }
    throw error;
  }
}

function drifted(
  path: string,
  target: string,
  reason: Extract<GlobalAliasInstallResult, { kind: "drifted" }>["reason"]
): GlobalAliasInstallResult {
  return Object.freeze({ kind: "drifted", path, target, durability: "unchanged", reason });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
