import type {
  ExportDestinationAsyncPort,
  ExportDestinationEntryObservation,
  ExportDestinationFailure as ExportDestinationResourceFailure,
  ExportDestinationMutation,
} from "@rawr/resource-agent-plugin-export-destination";

import { contentDigest } from "../../service/shared/release/index";
import { bytesEqual } from "../../service/modules/exports/model/helpers/canonical";
import type { ExportFailure, ExportFailureSet } from "../../service/modules/exports/model/dto/export-lifecycle";
import { createExportOwnerStateReader } from "./destination-owner";
import { failure } from "../../service/modules/exports/model/dto/filesystem";
import {
  createExportAppliedObservation,
  decodeExportAppliedObservation,
  decodeExportInverseAction,
  exportAppliedObservationDigest,
  fileStateBytes,
  observedDestinationEntry,
  verifyExportAppliedObservation,
  verifyExportInverseAction,
  type ExportAppliedObservationDigest,
  type ExportAppliedObservationV1,
  type ExportInverseActionDigest,
  type ExportInverseActionV1,
  type ExportObservedEntryStateV1,
} from "../../service/modules/exports/model/policy/inverse-action";
import {
  classifyExportOwnerReplay,
  classifyExportOwnerStaged,
  type ExportOwnerTargetBindingV1,
} from "../../service/modules/exports/model/policy/owner-protocol";

const MAX_INVERSE_CAPTURE_ENTRIES = 256;
const MAX_INVERSE_CAPTURE_BYTES = 96 * 1024 * 1024;

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

export async function executeExportInverseActionWithResource(
  actionInput: unknown,
  observationInput: unknown,
  resource: ExportDestinationAsyncPort,
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

  const state = createExportOwnerStateReader(resource);
  const targets = Object.freeze([targetBinding(action)]);
  if (observation.phase === "reverted") {
    const classification = await classifyExportOwnerStaged({ action, targets, state });
    return classification.kind === "NotApplied"
      ? Object.freeze({ kind: "ReadOnlyConverged", actionDigest })
      : blocked(actionDigest, classification.failure);
  }
  const classification = await classifyExportOwnerReplay({ action, observedPost: observation, targets, state });
  if (classification.kind === "Prior") return Object.freeze({ kind: "ReadOnlyConverged", actionDigest });
  if (classification.kind === "Ambiguous") return blocked(actionDigest, classification.failure);

  const readToken = `export-inverse-${(options.operationId ?? (() => actionDigest))()}`;
  let capture;
  try {
    capture = await resource.capture({
      destination: action.canonicalDestination,
      readToken,
      paths: [action.relativePath],
      maxEntries: MAX_INVERSE_CAPTURE_ENTRIES,
      maxBytes: MAX_INVERSE_CAPTURE_BYTES,
    });
  } catch (error) {
    return blocked(actionDigest, resourceFailure(error, "inverse-capture"));
  }
  const current = capture.entries[0];
  if (current === undefined || !matchesObserved(current, observation.observedPost)) {
    const cleanup = await releaseFailure(
      resource,
      capture.canonicalDestination,
      capture.readToken,
      capture.handle,
    );
    return blocked(
      actionDigest,
      failure("InverseStateMismatch", "inverse-capture", "Captured export state differs from its committed forward observation", action.relativePath),
      cleanup,
    );
  }

  const planDigest = `inverse-${actionDigest}`;
  const mutation = inverseMutation(action);
  let receipt;
  try {
    receipt = await resource.apply({
      destination: capture.canonicalDestination,
      planDigest,
      readToken: capture.readToken,
      captureHandle: capture.handle,
      mutations: [mutation],
    });
  } catch (error) {
    const primary = resourceFailure(error, "inverse-apply");
    return recoverInverseApplyFailure(resource, capture, planDigest, actionDigest, primary);
  }
  const post = receipt.entries[0];
  if (post === undefined || !matchesPrior(post, action)) {
    const primary = failure(
      "InverseStateMismatch",
      "inverse-verify",
      "Reverted export state differs from the action prior",
      action.relativePath,
    );
    return blocked(
      actionDigest,
      primary,
      await restoreAndSettleFailure(resource, capture, planDigest),
    );
  }
  const cleanup = await settleFailure(resource, capture.canonicalDestination, planDigest, capture.readToken, capture.handle);
  if (cleanup !== undefined) return blocked(actionDigest, cleanup);
  const replayObservation = createExportAppliedObservation(actionDigest, observedDestinationEntry(post), "reverted");
  return Object.freeze({
    kind: "RevertedVerified",
    actionDigest,
    replayObservation,
    replayObservationDigest: exportAppliedObservationDigest(replayObservation),
  });
}

async function recoverInverseApplyFailure(
  resource: ExportDestinationAsyncPort,
  capture: Readonly<{
    canonicalDestination: string;
    readToken: string;
    handle: string;
  }>,
  planDigest: string,
  actionDigest: ExportInverseActionDigest,
  primary: ExportFailure,
): Promise<ExportInverseReplayResult> {
  try {
    await resource.release({
      destination: capture.canonicalDestination,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
    return blocked(actionDigest, primary);
  } catch (error) {
    if (!isReleaseHandleState(error)) {
      return blocked(actionDigest, primary, resourceFailure(error, "inverse-release"));
    }
  }
  return blocked(
    actionDigest,
    primary,
    await restoreAndSettleFailure(resource, capture, planDigest),
  );
}

async function restoreAndSettleFailure(
  resource: ExportDestinationAsyncPort,
  capture: Readonly<{
    canonicalDestination: string;
    readToken: string;
    handle: string;
  }>,
  planDigest: string,
): Promise<ExportFailure | undefined> {
  try {
    await resource.restore({
      destination: capture.canonicalDestination,
      planDigest,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
  } catch (error) {
    return resourceFailure(error, "inverse-restore");
  }
  return settleFailure(resource, capture.canonicalDestination, planDigest, capture.readToken, capture.handle);
}

async function releaseFailure(
  resource: ExportDestinationAsyncPort,
  destination: string,
  readToken: string,
  captureHandle: string,
): Promise<ExportFailure | undefined> {
  try {
    await resource.release({ destination, readToken, captureHandle });
    return undefined;
  } catch (error) {
    return resourceFailure(error, "inverse-release");
  }
}

function isReleaseHandleState(error: unknown): error is ExportDestinationResourceFailure {
  return isResourceFailure(error) && error.operation === "release" && error.reason === "HandleState";
}

function inverseMutation(action: ExportInverseActionV1): ExportDestinationMutation {
  if (action.prior.kind === "Absent") {
    return action.expectedPost.kind === "Directory"
      ? Object.freeze({ kind: "RemoveEmptyDirectory", path: action.relativePath })
      : Object.freeze({ kind: "RemoveFile", path: action.relativePath });
  }
  if (action.prior.kind === "Directory") {
    return Object.freeze({ kind: "EnsureDirectory", path: action.relativePath, mode: action.prior.mode });
  }
  return Object.freeze({
    kind: "WriteFile",
    path: action.relativePath,
    mode: action.prior.mode,
    bytes: fileStateBytes(action.prior),
  });
}

function targetBinding(action: ExportInverseActionV1): ExportOwnerTargetBindingV1 {
  return Object.freeze({
    canonicalTarget: action.canonicalDestination,
    authorityGeneration: `elg1_${action.ledgerGeneration}`,
    authorityDigest: action.ledgerDigest,
  });
}

function matchesObserved(
  entry: ExportDestinationEntryObservation,
  observed: ExportObservedEntryStateV1,
): boolean {
  if (observed.kind === "Absent") return entry.kind === "Absent";
  if (observed.kind === "Directory") return entry.kind === "Directory"
    && entry.mode === observed.mode
    && entry.stat.dev === observed.dev
    && entry.stat.ino === observed.ino
    && entry.stat.birthtimeNs === observed.birthtimeNs;
  return entry.kind === "File"
    && entry.mode === observed.mode
    && entry.stat.dev === observed.dev
    && entry.stat.ino === observed.ino
    && entry.stat.size === observed.size
    && entry.stat.mtimeNs === observed.mtimeNs
    && entry.stat.ctimeNs === observed.ctimeNs
    && contentDigest(entry.bytes) === observed.contentDigest;
}

function matchesPrior(entry: ExportDestinationEntryObservation, action: ExportInverseActionV1): boolean {
  if (action.prior.kind === "Absent") return entry.kind === "Absent";
  if (action.prior.kind === "Directory") return entry.kind === "Directory" && entry.mode === action.prior.mode;
  return entry.kind === "File"
    && entry.mode === action.prior.mode
    && contentDigest(entry.bytes) === action.prior.contentDigest
    && bytesEqual(entry.bytes, fileStateBytes(action.prior));
}

function observationMatchesActionPhase(
  action: ExportInverseActionV1,
  observation: ExportAppliedObservationV1,
): boolean {
  if (observation.phase === "reverted") return observationMatchesState(observation.observedPost, action.prior);
  return observationMatchesState(observation.observedPost, action.expectedPost);
}

function observationMatchesState(
  observed: ExportObservedEntryStateV1,
  expected: ExportInverseActionV1["prior"] | ExportInverseActionV1["expectedPost"],
): boolean {
  if (expected.kind === "Absent") return observed.kind === "Absent";
  if (expected.kind === "Directory") return observed.kind === "Directory" && observed.mode === expected.mode;
  return observed.kind === "File"
    && observed.mode === expected.mode
    && observed.contentDigest === expected.contentDigest;
}

async function settleFailure(
  resource: ExportDestinationAsyncPort,
  destination: string,
  planDigest: string,
  readToken: string,
  captureHandle: string,
): Promise<ExportFailure | undefined> {
  try {
    await resource.settle({ destination, planDigest, readToken, captureHandle });
    return undefined;
  } catch (error) {
    return resourceFailure(error, "inverse-settle");
  }
}

function resourceFailure(error: unknown, phase: string): ExportFailure {
  if (isResourceFailure(error)) return failure(
    error.reason === "IdentityChanged" ? "InverseStateMismatch" : "MutationFailed",
    `${phase}:${error.operation}:${error.reason}`,
    error.detail,
    error.path,
  );
  return failure("MutationFailed", phase, error instanceof Error ? error.message : String(error));
}

function isResourceFailure(error: unknown): error is ExportDestinationResourceFailure {
  return typeof error === "object" && error !== null && "_tag" in error && error._tag === "ExportDestinationFailure";
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
