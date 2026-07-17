import { randomUUID } from "node:crypto";
import { link, rename } from "node:fs/promises";
import type { BigIntStats } from "node:fs";

import type {
  AtomicPackageOutput,
  AtomicPackageOutputRequest,
  AtomicPackageOutputResult,
  PackageOutputFailpoint,
  PackageOutputFailpoints,
} from "@rawr/agent-plugin-lifecycle/ports/packaging";
import { packageDigest } from "./node-cowork-v1";
import {
  FILE_MODE,
  PackagingOperationError,
  bytesEqual,
  captureCanonicalParent,
  captureFile,
  captureOutput,
  errorMessage,
  openPrivateTemporary,
  operationFailure,
  packagingFailure,
  phase,
  revalidateCapturedFile,
  revalidateCapturedOutput,
  revalidateParent,
  sameCapturedFile,
  sameIdentity,
  toOperationError,
  type CapturedFile,
  type CapturedParent,
} from "./node-output-identity";
import {
  cleanupOwnedTemporary,
  flushParent,
  inspectPublicationTemporaryCleanup,
  unlinkPublishedTemporaryLink,
  verifyPublishedOutput,
} from "./node-output-publication";

export interface NodeAtomicPackageOutputOptions {
  readonly failpoints?: PackageOutputFailpoints;
  readonly operationId?: () => string;
}

const MINIMUM_PRIOR_OUTPUT_READ_LIMIT = 64 * 1024 * 1024;

export function createNodeAtomicPackageOutput(
  options: NodeAtomicPackageOutputOptions = {},
): AtomicPackageOutput {
  const operationId = options.operationId ?? randomUUID;
  return {
    publish: (request) => publishPackageOutput(request, options.failpoints, operationId),
  };
}

async function publishPackageOutput(
  request: AtomicPackageOutputRequest,
  failpoints: PackageOutputFailpoints | undefined,
  operationId: () => string,
): Promise<AtomicPackageOutputResult> {
  const bytes = new Uint8Array(request.bytes);
  if (packageDigest(bytes) !== request.packageDigest) {
    return {
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: packagingFailure(
        "InvalidRequest",
        "package-digest",
        "Package digest does not bind the exact output bytes",
      ),
    };
  }
  let parent: CapturedParent | undefined;
  let temporary: CapturedFile | undefined;
  let outputWasCommitted = false;

  try {
    parent = await captureCanonicalParent(request.outputPath);
    const output = await captureOutput(
      request.outputPath,
      parent,
      Math.max(bytes.byteLength, MINIMUM_PRIOR_OUTPUT_READ_LIMIT),
    );
    await hitFailpoint(failpoints, "AfterOutputCaptured", request.outputPath);
    if (output.kind === "Present" && bytesEqual(output.bytes, bytes)) {
      await revalidateParent(parent);
      await revalidateCapturedFile(output.file, output.bytes, "OutputChanged", "output-convergence");
      return { kind: "ReadOnlyConverged" };
    }

    await revalidateParent(parent);
    const created = await openPrivateTemporary(parent, operationId);
    let temporaryWorkFailed = false;
    let temporaryWorkError: unknown;
    try {
      let initial: BigIntStats;
      try {
        initial = await phase(
          "TemporaryCreateFailed",
          "temporary-capture",
          () => created.handle.stat({ bigint: true }),
        );
      } catch (error) {
        throw new PackagingOperationError(
          toOperationError(error).primaryFailure,
          packagingFailure(
            "TemporaryCleanupBlocked",
            "temporary-capture",
            "Private temporary is preserved because its current-operation identity could not be captured",
          ),
        );
      }
      temporary = captureFile(created.path, initial);
      await hitFailpoint(failpoints, "AfterTemporaryCreated", request.outputPath, temporary.path);
      await admitAndWriteTemporary(created.handle, parent, temporary, bytes);
      temporary = captureFile(temporary.path, await created.handle.stat({ bigint: true }));
    } catch (error) {
      temporaryWorkFailed = true;
      temporaryWorkError = error;
    }
    try {
      await created.handle.close();
    } catch (error) {
      if (temporaryWorkFailed) {
        throw new PackagingOperationError(
          toOperationError(temporaryWorkError).primaryFailure,
          packagingFailure(
            "TemporaryCleanupFailed",
            "temporary-close",
            `Private temporary handle could not be closed: ${errorMessage(error)}`,
          ),
        );
      }
      throw operationFailure(
        "TemporaryWriteFailed",
        "temporary-close",
        `Private temporary handle could not be closed: ${errorMessage(error)}`,
      );
    }
    if (temporaryWorkFailed) throw temporaryWorkError;
    if (temporary === undefined) {
      throw operationFailure(
        "TemporaryCreateFailed",
        "temporary-capture",
        "Private temporary completed without a captured identity",
      );
    }

    await hitFailpoint(failpoints, "AfterTemporaryWritten", request.outputPath, temporary.path);
    const admittedTemporary = temporary;
    await revalidateCapturedFile(admittedTemporary, bytes, "TemporaryVerifyFailed", "temporary-verification");
    await hitFailpoint(failpoints, "AfterTemporaryVerified", request.outputPath, admittedTemporary.path);
    await hitFailpoint(failpoints, "BeforeOutputCommit", request.outputPath, admittedTemporary.path);
    await revalidateCapturedFile(
      admittedTemporary,
      bytes,
      "TemporaryVerifyFailed",
      "temporary-precommit",
      () => hitFailpoint(
        failpoints,
        "AfterTemporaryPrecommitRead",
        request.outputPath,
        admittedTemporary.path,
      ),
    );
    await revalidateParent(parent);
    await hitFailpoint(
      failpoints,
      "AfterParentPrecommitRead",
      request.outputPath,
      admittedTemporary.path,
    );
    await revalidateCapturedOutput(
      request.outputPath,
      output,
      () => hitFailpoint(
        failpoints,
        "AfterOutputPrecommitRead",
        request.outputPath,
        admittedTemporary.path,
      ),
    );

    if (output.kind === "Absent") {
      await phase(
        "OutputCommitFailed",
        "output-no-replace-link",
        () => link(admittedTemporary.path, request.outputPath),
      );
      outputWasCommitted = true;
      try {
        await unlinkPublishedTemporaryLink(
          parent,
          admittedTemporary,
          request.outputPath,
          () => hitFailpoint(
            failpoints,
            "BeforePublicationLinkUnlink",
            request.outputPath,
            admittedTemporary.path,
          ),
        );
        temporary = undefined;
      } catch (error) {
        const cleanupFailure = await inspectPublicationTemporaryCleanup(parent, admittedTemporary);
        throw new PackagingOperationError(
          packagingFailure(
            "OutputCommitFailed",
            "output-no-replace-finalize",
            `Output became visible but its private publication link could not be finalized: ${errorMessage(error)}`,
          ),
          cleanupFailure,
        );
      }
    } else {
      await phase(
        "OutputCommitFailed",
        "output-atomic-replace",
        () => rename(admittedTemporary.path, request.outputPath),
      );
      outputWasCommitted = true;
      temporary = undefined;
    }

    await hitFailpoint(failpoints, "AfterOutputCommit", request.outputPath);
    await flushParent(parent);
    await hitFailpoint(failpoints, "BeforeFinalVerification", request.outputPath);
    await verifyPublishedOutput(request.outputPath, parent, bytes);
    return {
      kind: "OutputReplacedVerified",
      priorOutput: output.kind === "Absent" ? "Absent" : "Replaced",
    };
  } catch (error) {
    const operationError = toOperationError(error);
    if (outputWasCommitted) {
      return {
        kind: "OutputUnsettled",
        primaryFailure: operationError.primaryFailure,
        ...(operationError.cleanupFailure === undefined
          ? {}
          : { cleanupFailure: operationError.cleanupFailure }),
      };
    }
    const cleanupFailure = operationError.cleanupFailure
      ?? (parent !== undefined && temporary !== undefined
        ? await cleanupOwnedTemporary(parent, temporary)
        : undefined);
    return {
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: operationError.primaryFailure,
      ...(cleanupFailure === undefined ? {} : { cleanupFailure }),
    };
  }
}

async function admitAndWriteTemporary(
  handle: Awaited<ReturnType<typeof openPrivateTemporary>>["handle"],
  parent: CapturedParent,
  temporary: CapturedFile,
  bytes: Uint8Array,
): Promise<void> {
  const admitted = await phase(
    "TemporaryCreateFailed",
    "temporary-admission",
    () => handle.stat({ bigint: true }),
  );
  if (
    !admitted.isFile()
    || admitted.nlink !== 1n
    || admitted.dev !== parent.dev
    || !sameCapturedFile(temporary, admitted)
  ) {
    throw operationFailure(
      "TemporaryCreateFailed",
      "temporary-admission",
      "Private temporary changed before creation admission completed",
    );
  }
  await phase("TemporaryWriteFailed", "temporary-write", () => handle.writeFile(bytes));
  await phase("TemporaryWriteFailed", "temporary-mode", () => handle.chmod(FILE_MODE));
  await phase("TemporaryWriteFailed", "temporary-flush", () => handle.sync());
  const written = await handle.stat({ bigint: true });
  if (
    !sameIdentity(temporary, written)
    || written.nlink !== 1n
    || written.size !== BigInt(bytes.byteLength)
  ) {
    throw operationFailure(
      "TemporaryWriteFailed",
      "temporary-write",
      "Private temporary identity changed while it was open",
    );
  }
}

async function hitFailpoint(
  failpoints: PackageOutputFailpoints | undefined,
  point: PackageOutputFailpoint,
  outputPath: string,
  temporaryPath?: string,
): Promise<void> {
  if (failpoints === undefined) return;
  try {
    await failpoints.hit(point, {
      outputPath,
      ...(temporaryPath === undefined ? {} : { temporaryPath }),
    });
  } catch (error) {
    throw operationFailure(
      "FailpointFailed",
      point,
      `Injected output failpoint failed: ${errorMessage(error)}`,
    );
  }
}
