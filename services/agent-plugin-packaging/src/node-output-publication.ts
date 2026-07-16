import { constants } from "node:fs";
import { lstat, open, realpath, unlink } from "node:fs/promises";
import { dirname } from "node:path";

import type { PackagingFailure } from "./contract";
import {
  FILE_MODE,
  PackagingOperationError,
  assertPrivateDirectChild,
  assertSafeRegularFile,
  captureFile,
  errorMessage,
  lstatIfPresent,
  packagingFailure,
  phase,
  revalidateCapturedFile,
  revalidateParent,
  sameIdentity,
  type CapturedFile,
  type CapturedParent,
} from "./node-output-identity";

export async function verifyPublishedOutput(
  outputPath: string,
  parent: CapturedParent,
  expectedBytes: Uint8Array,
): Promise<void> {
  await revalidateParent(parent);
  const stats = await phase(
    "OutputVerifyFailed",
    "output-final",
    () => lstat(outputPath, { bigint: true }),
  );
  assertSafeRegularFile(outputPath, parent, stats, "OutputVerifyFailed", "output-final");
  if ((stats.mode & 0o777n) !== BigInt(FILE_MODE)) {
    throw new PackagingOperationError(packagingFailure(
      "OutputVerifyFailed",
      "output-final",
      "Published output mode is not canonical",
    ));
  }
  const file = captureFile(outputPath, stats);
  await revalidateCapturedFile(file, expectedBytes, "OutputVerifyFailed", "output-final");
}

export async function unlinkPublishedTemporaryLink(
  parent: CapturedParent,
  temporary: CapturedFile,
  outputPath: string,
  beforeFinalGuard?: () => Promise<void>,
): Promise<void> {
  assertPrivateDirectChild(parent.path, temporary.path);
  if (dirname(outputPath) !== parent.path) {
    throw new Error("Published output is not a direct child of the captured parent");
  }
  await validatePublicationLinks(parent, temporary, outputPath);
  await beforeFinalGuard?.();
  await validatePublicationLinks(parent, temporary, outputPath);
  await unlink(temporary.path);
}

async function validatePublicationLinks(
  parent: CapturedParent,
  temporary: CapturedFile,
  outputPath: string,
): Promise<void> {
  await revalidateParent(parent);
  const [temporaryStats, outputStats] = await Promise.all([
    lstat(temporary.path, { bigint: true }),
    lstat(outputPath, { bigint: true }),
  ]);
  if (
    !temporaryStats.isFile()
    || temporaryStats.isSymbolicLink()
    || !outputStats.isFile()
    || outputStats.isSymbolicLink()
    || temporaryStats.nlink !== 2n
    || outputStats.nlink !== 2n
    || temporaryStats.dev !== parent.dev
    || outputStats.dev !== parent.dev
    || !sameIdentity(temporary, temporaryStats)
    || !sameIdentity(temporary, outputStats)
    || temporaryStats.mode !== temporary.mode
    || outputStats.mode !== temporary.mode
    || temporaryStats.size !== temporary.size
    || outputStats.size !== temporary.size
    || temporaryStats.mtimeNs !== temporary.mtimeNs
    || outputStats.mtimeNs !== temporary.mtimeNs
  ) {
    throw new Error("Publication links do not identify the exact current-operation file");
  }
  const [immediateTemporary, immediateOutput] = await Promise.all([
    lstat(temporary.path, { bigint: true }),
    lstat(outputPath, { bigint: true }),
  ]);
  if (
    !immediateTemporary.isFile()
    || immediateTemporary.isSymbolicLink()
    || !immediateOutput.isFile()
    || immediateOutput.isSymbolicLink()
    || immediateTemporary.nlink !== 2n
    || immediateOutput.nlink !== 2n
    || !sameIdentity(temporary, immediateTemporary)
    || !sameIdentity(temporary, immediateOutput)
  ) {
    throw new Error("Publication links changed after their canonical-path proof");
  }
}

export async function inspectPublicationTemporaryCleanup(
  parent: CapturedParent,
  temporary: CapturedFile,
): Promise<PackagingFailure | undefined> {
  try {
    assertPrivateDirectChild(parent.path, temporary.path);
    await revalidateParent(parent);
    const stats = await lstatIfPresent(
      temporary.path,
      "TemporaryCleanupBlocked",
      "output-no-replace-finalize",
    );
    if (stats === undefined) return undefined;
    if (
      !stats.isFile()
      || stats.isSymbolicLink()
      || !sameIdentity(temporary, stats)
      || stats.nlink < 1n
    ) {
      return packagingFailure(
        "TemporaryCleanupBlocked",
        "output-no-replace-finalize",
        "A non-owned private-path candidate was preserved after publication-link finalization failed",
      );
    }
    return packagingFailure(
      stats.nlink <= 2n ? "TemporaryCleanupFailed" : "TemporaryCleanupBlocked",
      "output-no-replace-finalize",
      stats.nlink <= 2n
        ? "The current operation's private publication link remains present"
        : "The current operation file gained additional links and cleanup was blocked",
    );
  } catch (error) {
    return packagingFailure(
      "TemporaryCleanupBlocked",
      "output-no-replace-finalize",
      `Publication-link cleanup state could not be proven: ${errorMessage(error)}`,
    );
  }
}

export async function cleanupOwnedTemporary(
  parent: CapturedParent,
  temporary: CapturedFile,
): Promise<PackagingFailure | undefined> {
  try {
    assertPrivateDirectChild(parent.path, temporary.path);
    await revalidateParent(parent);
    const stats = await lstatIfPresent(
      temporary.path,
      "TemporaryCleanupBlocked",
      "temporary-cleanup",
    );
    if (stats === undefined) return undefined;
    if (
      !stats.isFile()
      || stats.isSymbolicLink()
      || stats.nlink !== 1n
      || !sameIdentity(temporary, stats)
    ) {
      return packagingFailure(
        "TemporaryCleanupBlocked",
        "temporary-cleanup",
        "Private temporary candidate no longer identifies the current operation's one regular file",
      );
    }
    const resolved = await realpath(temporary.path);
    if (resolved !== temporary.path) {
      return packagingFailure(
        "TemporaryCleanupBlocked",
        "temporary-cleanup-realpath",
        "Private temporary candidate resolves through an alias",
      );
    }
    await revalidateParent(parent);
    const immediate = await lstat(temporary.path, { bigint: true });
    if (
      !immediate.isFile()
      || immediate.isSymbolicLink()
      || immediate.nlink !== 1n
      || !sameIdentity(temporary, immediate)
    ) {
      return packagingFailure(
        "TemporaryCleanupBlocked",
        "temporary-cleanup-immediate",
        "Private temporary candidate changed before one-file unlink",
      );
    }
    const immediateResolved = await realpath(temporary.path);
    if (immediateResolved !== temporary.path) {
      return packagingFailure(
        "TemporaryCleanupBlocked",
        "temporary-cleanup-immediate",
        "Private temporary candidate became aliased before one-file unlink",
      );
    }
    await unlink(temporary.path);
    await flushParent(parent);
    return undefined;
  } catch (error) {
    if (error instanceof PackagingOperationError) {
      return packagingFailure(
        "TemporaryCleanupBlocked",
        "temporary-cleanup",
        `Guarded one-file temporary unlink was blocked: ${error.primaryFailure.message}`,
      );
    }
    return packagingFailure(
      "TemporaryCleanupFailed",
      "temporary-cleanup",
      `Guarded one-file temporary unlink failed: ${errorMessage(error)}`,
    );
  }
}

export async function flushParent(parent: CapturedParent): Promise<void> {
  const handle = await phase(
    "OutputVerifyFailed",
    "output-parent-flush",
    () => open(parent.path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW),
  );
  try {
    const stats = await handle.stat({ bigint: true });
    if (!stats.isDirectory() || !sameIdentity(parent, stats)) {
      throw new PackagingOperationError(packagingFailure(
        "OutputVerifyFailed",
        "output-parent-flush",
        "Opened parent differs from the captured output parent",
      ));
    }
    await phase("OutputVerifyFailed", "output-parent-flush", () => handle.sync());
  } finally {
    await handle.close();
  }
}
