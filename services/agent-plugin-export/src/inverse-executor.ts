import { randomUUID } from "node:crypto";

import type { ExportFailure, ExportFailureSet } from "./contract";
import {
  LEDGER_TEMP_PREFIX,
  PAYLOAD_TEMP_PREFIX,
  ExportFilesystemError,
  captureDirectFile,
  captureDestination,
  captureEmptyDirectory,
  captureExistingDirectory,
  captureOpenedTemporary,
  capturePath,
  cleanupOwnedTemporary,
  closeTemporary,
  commitTemporary,
  ensureDirectories,
  failure,
  openPrivateTemporary,
  removeCapturedEmptyDirectory,
  toFilesystemError,
  unlinkCapturedFile,
  verifyOwnedTemporary,
  verifyPathAbsent,
  verifyPublishedFile,
  visibleDirectoryMode,
  visibleFileMode,
  writeOpenedTemporary,
  type CapturedDirectory,
  type CapturedPath,
  type CapturedRegularFile,
  type DestinationIdentity,
  type OpenedTemporary,
  type OwnedTemporary,
} from "./filesystem";
import {
  createExportAppliedObservation,
  decodeExportAppliedObservation,
  decodeExportInverseAction,
  exportAppliedObservationDigest,
  fileStateBytes,
  observedDirectory,
  observedFile,
  verifyExportAppliedObservation,
  verifyExportInverseAction,
  type ExportAppliedObservationDigest,
  type ExportAppliedObservationV1,
  type ExportFileStateV1,
  type ExportInverseActionDigest,
  type ExportInverseActionV1,
  type ExportObservedEntryStateV1,
} from "./inverse-action";
import {
  EXPORT_LEDGER_FILENAME,
  initialExportLedger,
  ledgerScope,
  verifyExportLedgerBytes,
  type ExportLedgerV1,
} from "./ledger";

export interface ExecuteExportInverseOptions {
  readonly operationId?: () => string;
}

export type ExportInverseReplayResult =
  | Readonly<{ kind: "Invalid"; failure: ExportFailure }>
  | Readonly<{
    kind: "Blocked";
    actionDigest: ExportInverseActionDigest;
    failures: ExportFailureSet;
    recoveryRequired: true;
  }>
  | Readonly<{ kind: "ReadOnlyConverged"; actionDigest: ExportInverseActionDigest }>
  | Readonly<{
    kind: "RevertedVerified";
    actionDigest: ExportInverseActionDigest;
    replayObservation: ExportAppliedObservationV1;
    replayObservationDigest: ExportAppliedObservationDigest;
  }>;

export async function executeExportInverseAction(
  actionInput: unknown,
  observationInput: unknown,
  options: ExecuteExportInverseOptions = {},
): Promise<ExportInverseReplayResult> {
  const actionVerification = actionInput instanceof Uint8Array
    ? decodeExportInverseAction(actionInput)
    : verifyExportInverseAction(actionInput);
  if (!actionVerification.ok) return invalid("InverseActionInvalid", "inverse-action", actionVerification.message);
  const observationVerification = observationInput instanceof Uint8Array
    ? decodeExportAppliedObservation(observationInput)
    : verifyExportAppliedObservation(observationInput);
  if (!observationVerification.ok) return invalid("InverseActionInvalid", "inverse-observation", observationVerification.message);
  const { action, actionDigest } = actionVerification;
  const observation = observationVerification.observation;
  if (observation.actionDigest !== actionDigest || !observationMatchesActionPhase(action, observation)) {
    return invalid("InverseActionInvalid", "inverse-observation", "Applied observation does not bind the action transition phase");
  }

  try {
    const destination = await captureDestination(action.canonicalDestination);
    const ledger = await captureLedger(destination, action.layout);
    if (action.mutation === "write-ledger") {
      const state = await inspectActionEntry(destination, action, observation.observedPost);
      if (observation.phase === "reverted") {
        await assertLedgerAuthorityState(action, ledger, "prior");
        if (!state.matches) return blocked(actionDigest, failure("InverseStateMismatch", "inverse-convergence", state.message));
        return Object.freeze({ kind: "ReadOnlyConverged", actionDigest });
      }
      await assertLedgerAuthorityState(action, ledger, "forward");
      if (!state.matches) return blocked(actionDigest, failure("InverseStateMismatch", "inverse-current", state.message));
      return restoreFileEntry(destination, action, actionDigest, state.path, options);
    }

    assertPriorLedger(action, ledger);
    assertPluginAuthority(action, ledger);
    const state = await inspectActionEntry(destination, action, observation.observedPost);
    if (!state.matches) return blocked(actionDigest, failure("InverseStateMismatch", "inverse-current", state.message));
    if (observation.phase === "reverted") {
      return Object.freeze({ kind: "ReadOnlyConverged", actionDigest });
    }
    if (action.mutation === "create-directory") {
      if (state.path.kind !== "Directory") return blocked(actionDigest, failure("InverseStateMismatch", "inverse-directory", "Created directory is not the exact observed directory"));
      return removeCreatedDirectory(destination, action, actionDigest, state.path.directory);
    }
    if (action.mutation === "retire-directory") {
      return restoreRetiredDirectory(destination, action, actionDigest);
    }
    return restoreFileEntry(destination, action, actionDigest, state.path, options);
  } catch (error) {
    const converted = toFilesystemError(error);
    return blocked(actionDigest, converted.failure, converted.cleanupFailure);
  }
}

type InspectedPath =
  | Readonly<{ kind: "Absent"; captured: Extract<CapturedPath, { kind: "Absent" }> }>
  | Readonly<{ kind: "File"; captured: Extract<CapturedPath, { kind: "Present" }> }>
  | Readonly<{ kind: "Directory"; directory: CapturedDirectory }>;

async function inspectActionEntry(
  destination: DestinationIdentity,
  action: ExportInverseActionV1,
  observed: ExportObservedEntryStateV1,
): Promise<Readonly<{ matches: boolean; message: string; path: InspectedPath }>> {
  if (observed.kind === "Directory") {
    const directory = await captureExistingDirectory(destination, action.relativePath);
    return {
      matches: directoryMatchesObservation(directory, observed),
      message: "Live directory differs from its exact applied observation",
      path: { kind: "Directory", directory },
    };
  }
  const maximum = action.mutation === "create-directory" || action.mutation === "retire-directory"
    ? 1
    : maximumFileStateBytes(action.prior, action.expectedPost);
  const captured = await capturePath(destination, action.relativePath, maximum);
  if (observed.kind === "Absent") {
    return {
      matches: captured.kind === "Absent",
      message: "Live path is occupied but the applied observation binds absence",
      path: captured.kind === "Absent" ? { kind: "Absent", captured } : { kind: "File", captured },
    };
  }
  return {
    matches: captured.kind === "Present" && fileMatchesObservation(captured.file, observed),
    message: "Live file differs from its exact applied observation",
    path: captured.kind === "Absent" ? { kind: "Absent", captured } : { kind: "File", captured },
  };
}

async function restoreFileEntry(
  destination: DestinationIdentity,
  action: ExportInverseActionV1,
  actionDigest: ExportInverseActionDigest,
  current: InspectedPath,
  options: ExecuteExportInverseOptions,
): Promise<ExportInverseReplayResult> {
  if (action.mutation === "create-directory" || action.mutation === "retire-directory") {
    return blocked(actionDigest, failure("InverseActionInvalid", "inverse-file", "Directory action reached file restoration"));
  }
  const prior = action.prior;
  if (prior.kind === "Absent") {
    if (current.kind === "Absent") return reverted(actionDigest, Object.freeze({ kind: "Absent" }));
    if (current.kind !== "File") return blocked(actionDigest, failure("InverseStateMismatch", "inverse-unlink", "Expected applied file is not one exact regular file"));
    try {
      await unlinkCapturedFile(destination, current.captured.file);
      await verifyPathAbsent(destination, action.relativePath, current.captured.file.parentChain);
      return reverted(actionDigest, Object.freeze({ kind: "Absent" }));
    } catch (error) {
      return blockedFromError(actionDigest, error);
    }
  }
  if (current.kind === "Directory") return blocked(actionDigest, failure("InverseStateMismatch", "inverse-restore", "File restore target is a directory"));
  if (prior.kind === "Directory") return blocked(actionDigest, failure("InverseActionInvalid", "inverse-restore", "Directory prior reached file restoration"));
  const target = current.captured;
  const bytes = fileStateBytes(prior);
  let opened: OpenedTemporary | undefined;
  let temporary: OwnedTemporary | undefined;
  let closed = false;
  let committed = false;
  try {
    opened = await openPrivateTemporary(
      destination,
      target.kind === "Absent" ? target.path : target.file.path,
      action.mutation === "write-ledger" ? LEDGER_TEMP_PREFIX : PAYLOAD_TEMP_PREFIX,
      (options.operationId ?? randomUUID)(),
    );
    temporary = await captureOpenedTemporary(destination, opened);
    try {
      temporary = await writeOpenedTemporary(destination, opened, temporary, bytes, prior.mode);
    } catch (error) {
      try {
        temporary = await captureOpenedTemporary(destination, opened, temporary);
      } catch {
        // Preserve the candidate when exact current-operation identity cannot be recovered.
      }
      throw error;
    }
    await closeTemporary(opened);
    closed = true;
    await verifyOwnedTemporary(temporary, bytes, prior.mode);
    const publishedByOperation = await commitTemporary(destination, temporary, target);
    committed = true;
    temporary = undefined;
    const published = await verifyPublishedFile(
      destination,
      action.relativePath,
      bytes,
      prior.mode,
      publishedByOperation,
    );
    return reverted(actionDigest, observedFile(published));
  } catch (error) {
    const primary = toFilesystemError(error).failure;
    let cleanup: ExportFailure | undefined;
    if (opened !== undefined && !closed) {
      try {
        await closeTemporary(opened);
      } catch (closeError) {
        cleanup = failure("TemporaryCleanupFailed", "inverse-temporary-close", errorMessage(closeError), opened.path);
      }
    }
    if (temporary !== undefined) cleanup ??= await cleanupOwnedTemporary(destination, temporary);
    if (!committed && opened !== undefined && temporary === undefined) {
      cleanup ??= failure("TemporaryCleanupBlocked", "inverse-temporary-cleanup", "Inverse temporary identity is unavailable; candidate is preserved", opened.path);
    }
    return blocked(actionDigest, primary, cleanup);
  }
}

async function removeCreatedDirectory(
  destination: DestinationIdentity,
  action: ExportInverseActionV1,
  actionDigest: ExportInverseActionDigest,
  directory: CapturedDirectory,
): Promise<ExportInverseReplayResult> {
  try {
    const empty = await captureEmptyDirectory(destination, action.relativePath);
    if (empty === undefined || !sameDirectoryIdentity(empty, directory)) {
      return blocked(actionDigest, failure("InverseStateMismatch", "inverse-directory-remove", "Observed directory is nonempty or changed"));
    }
    await removeCapturedEmptyDirectory(destination, empty);
    await verifyPathAbsent(destination, action.relativePath, empty.parentChain);
    return reverted(actionDigest, Object.freeze({ kind: "Absent" }));
  } catch (error) {
    return blockedFromError(actionDigest, error);
  }
}

async function restoreRetiredDirectory(
  destination: DestinationIdentity,
  action: ExportInverseActionV1,
  actionDigest: ExportInverseActionDigest,
): Promise<ExportInverseReplayResult> {
  if (action.mutation !== "retire-directory" || action.prior.kind !== "Directory") {
    return blocked(actionDigest, failure("InverseActionInvalid", "inverse-directory-restore", "Directory retirement action is malformed"));
  }
  try {
    const created = await ensureDirectories(destination, [action.relativePath], action.prior.mode);
    if (created.length !== 1) return blocked(actionDigest, failure("InverseStateMismatch", "inverse-directory-restore", "Directory restore did not create exactly one entry"));
    return reverted(actionDigest, observedDirectory(created[0]!));
  } catch (error) {
    return blockedFromError(actionDigest, error);
  }
}

async function captureLedger(destination: DestinationIdentity, layout: ExportInverseActionV1["layout"]): Promise<ExportLedgerV1> {
  const slot = await captureDirectFile(destination, EXPORT_LEDGER_FILENAME);
  if (slot.kind === "Absent") return initialExportLedger(destination.path, layout);
  if (visibleFileMode(slot.file) !== 0o644) throw authorityError("Current inverse ledger mode is not canonical");
  const verified = verifyExportLedgerBytes(slot.file.bytes, destination.path);
  if (!verified.ok || verified.ledger.body.layout !== layout) throw authorityError(verified.ok ? "Current inverse ledger layout differs" : verified.message);
  return verified.ledger;
}

function assertPriorLedger(action: ExportInverseActionV1, ledger: ExportLedgerV1): void {
  if (ledger.body.generation !== action.ledgerGeneration || ledger.ledgerDigest !== action.ledgerDigest || ledger.body.layout !== action.layout) {
    throw authorityError("Current destination ledger does not match the inverse action authority generation");
  }
}

async function assertLedgerAuthorityState(
  action: ExportInverseActionV1,
  ledger: ExportLedgerV1,
  phase: "forward" | "prior",
): Promise<void> {
  if (action.authority.kind !== "destination-ledger") throw authorityError("Ledger inverse action lacks destination-ledger authority");
  if (phase === "prior") {
    assertPriorLedger(action, ledger);
    return;
  }
  if (ledger.body.generation !== action.authority.nextGeneration || ledger.body.layout !== action.layout) {
    throw authorityError("Current destination ledger does not match the applied next generation");
  }
}

function assertPluginAuthority(action: ExportInverseActionV1, ledger: ExportLedgerV1): void {
  if (action.authority.kind === "destination-ledger") throw authorityError("Non-ledger action cannot use destination-ledger authority");
  const scope = ledgerScope(ledger, action.authority.pluginId);
  if (action.authority.kind === "plugin-claim") {
    if (scope === undefined || scope.releaseDigest !== action.authority.releaseDigest) throw authorityError("Inverse plugin claim is absent from the prior ledger generation");
    const claimed = action.mutation === "create-directory" || action.mutation === "retire-directory"
      ? scope.directories.includes(action.relativePath)
      : scope.files.some((file) => file.relativePath === action.relativePath);
    if (!claimed) throw authorityError("Inverse path is not claimed by its plugin authority");
    return;
  }
  const claimedByAny = ledger.body.scopes.some((candidate) =>
    candidate.files.some((file) => file.relativePath === action.relativePath));
  if (claimedByAny) throw authorityError("Planned-adoption inverse path was already ledger-owned");
}

function observationMatchesActionPhase(action: ExportInverseActionV1, observation: ExportAppliedObservationV1): boolean {
  const expected = observation.phase === "forward" ? action.expectedPost : action.prior;
  if (expected.kind === "Absent") return observation.observedPost.kind === "Absent";
  if (expected.kind === "Directory") {
    return observation.observedPost.kind === "Directory" && observation.observedPost.mode === expected.mode;
  }
  return observation.observedPost.kind === "File"
    && observation.observedPost.mode === expected.mode
    && observation.observedPost.contentDigest === expected.contentDigest;
}

function fileMatchesObservation(file: CapturedRegularFile, observed: Extract<ExportObservedEntryStateV1, { kind: "File" }>): boolean {
  return visibleFileMode(file) === observed.mode
    && file.dev.toString(10) === observed.dev
    && file.ino.toString(10) === observed.ino
    && file.size.toString(10) === observed.size
    && file.mtimeNs.toString(10) === observed.mtimeNs
    && file.ctimeNs.toString(10) === observed.ctimeNs
    && file.contentDigest === observed.contentDigest;
}

function directoryMatchesObservation(
  directory: CapturedDirectory,
  observed: Extract<ExportObservedEntryStateV1, { kind: "Directory" }>,
): boolean {
  return visibleDirectoryMode(directory) === observed.mode
    && directory.dev.toString(10) === observed.dev
    && directory.ino.toString(10) === observed.ino
    && directory.birthtimeNs.toString(10) === observed.birthtimeNs;
}

function sameDirectoryIdentity(left: CapturedDirectory, right: CapturedDirectory): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && visibleDirectoryMode(left) === visibleDirectoryMode(right);
}

function maximumFileStateBytes(...states: readonly (ExportFileStateV1 | object)[]): number {
  let maximum = 1;
  for (const state of states) {
    if ("kind" in state && state.kind === "Present" && "bytesBase64" in state && typeof state.bytesBase64 === "string") {
      maximum = Math.max(maximum, Math.ceil(state.bytesBase64.length * 0.75));
    }
  }
  return maximum;
}

function reverted(actionDigest: ExportInverseActionDigest, observedPost: ExportObservedEntryStateV1): ExportInverseReplayResult {
  const replayObservation = createExportAppliedObservation(actionDigest, observedPost, "reverted");
  return Object.freeze({
    kind: "RevertedVerified",
    actionDigest,
    replayObservation,
    replayObservationDigest: exportAppliedObservationDigest(replayObservation),
  });
}

function invalid(code: ExportFailure["code"], phase: string, message: string): ExportInverseReplayResult {
  return Object.freeze({ kind: "Invalid", failure: failure(code, phase, message) });
}

function blocked(
  actionDigest: ExportInverseActionDigest,
  primary: ExportFailure,
  cleanup?: ExportFailure,
): ExportInverseReplayResult {
  return Object.freeze({
    kind: "Blocked",
    actionDigest,
    failures: cleanup === undefined
      ? Object.freeze({ kind: "PrimaryOnly", primary })
      : Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup }),
    recoveryRequired: true,
  });
}

function blockedFromError(actionDigest: ExportInverseActionDigest, error: unknown): ExportInverseReplayResult {
  const converted = toFilesystemError(error);
  return blocked(actionDigest, converted.failure, converted.cleanupFailure);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function authorityError(message: string): ExportFilesystemError {
  return new ExportFilesystemError(failure("InverseAuthorityMismatch", "inverse-authority", message));
}
