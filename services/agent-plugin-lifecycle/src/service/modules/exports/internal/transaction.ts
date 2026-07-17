import type {
  ExportDestinationAsyncPort,
  ExportDestinationCapture,
  ExportDestinationEntryObservation,
  ExportDestinationFailure as ExportDestinationResourceFailure,
  ExportDestinationMutation,
} from "@rawr/resource-agent-plugin-export-destination";

import {
  compareCanonicalText,
  contentDigest,
  parseReleaseRelativePath,
  type PluginId,
  type ReleaseDigest,
  type ReleaseRelativePath,
} from "../../../shared/release/index";
import type {
  ExportAppliedEvent,
  ExportFailpoint,
  ExportFailpoints,
  ExportFailure,
  ExportFailureSet,
  UndoApplyingSession,
  UndoFailure,
  UndoReleaseResult,
} from "./contract";
import { bytesEqual } from "./canonical";
import { failure } from "./filesystem-model";
import {
  createExportAppliedObservation,
  createExportInverseAction,
  directoryPriorFromDestinationObservation,
  exportInverseActionDigest,
  fileStateBytes,
  fileStateFromBytes,
  fileStateFromDestinationObservation,
  observedDestinationEntry,
  type ExportActionAuthorityV1,
  type ExportInverseActionV1,
} from "./inverse-action";
import { EXPORT_LEDGER_FILENAME } from "./ledger";
import type { DestinationExportPlan } from "./plan";

const MAX_ACTION_CAPTURE_ENTRIES = 1_000_000;
const MAX_ACTION_CAPTURE_BYTES = 1024 * 1024 * 1024;

export interface ExportMutationSession {
  readonly capsule: {
    generation: string;
    synchronization: UndoReleaseResult | null;
  };
  readonly undoSession: UndoApplyingSession;
  readonly admittedActionSequence: {
    readonly entries: readonly Readonly<{
      actionDigest: ReturnType<typeof exportInverseActionDigest>;
      actionHandle: string;
    }>[];
    nextIndex: number;
  };
  readonly failpoints?: ExportFailpoints;
  readonly operationId?: () => string;
}

export type DestinationTransactionResult =
  | Readonly<{
    kind: "Applied";
    applied: readonly ExportAppliedEvent[];
    verifiedPaths: readonly string[];
    retiredPaths: readonly string[];
    preservedPaths: readonly string[];
  }>
  | Readonly<{ kind: "Rejected"; failures: ExportFailureSet }>
  | Readonly<{
    kind: "Unsettled";
    applied: readonly ExportAppliedEvent[];
    failures: ExportFailureSet;
  }>;

interface StagedAction {
  readonly action: ExportInverseActionV1;
  readonly digest: ReturnType<typeof exportInverseActionDigest>;
  readonly actionHandle: string;
}

interface ActionStep {
  readonly action: ExportInverseActionV1;
  readonly mutation: ExportDestinationMutation;
}

export function planDestinationInverseActions(
  plan: DestinationExportPlan,
): readonly ExportInverseActionV1[] {
  const actions: ExportInverseActionV1[] = [];
  const createdDirectories = new Set<string>();
  for (const write of plan.writes) {
    const authority = pluginAuthority(write.authority, write.file.pluginId, write.authorityReleaseDigest);
    for (const directory of write.createdDirectories) {
      if (createdDirectories.has(directory)) continue;
      const relativePath = mustRelativePath(directory);
      actions.push(createExportInverseAction({
        ...actionBase(plan, authority, relativePath),
        mutation: "create-directory",
        prior: Object.freeze({ kind: "Absent" }),
        expectedPost: Object.freeze({ kind: "Directory", mode: 0o755 }),
      }));
      createdDirectories.add(directory);
    }
    if (write.prior.kind === "Directory") throw new TypeError(`Payload write prior is a directory: ${write.file.relativePath}`);
    actions.push(createExportInverseAction({
      ...actionBase(plan, authority, write.file.relativePath),
      mutation: "write-payload",
      prior: write.prior.kind === "Absent"
        ? Object.freeze({ kind: "Absent" })
        : fileStateFromDestinationObservation(write.prior),
      expectedPost: fileStateFromBytes(write.file.bytes, write.file.mode, write.file.contentDigest),
    }));
  }
  for (const retirement of plan.retirements) {
    actions.push(createExportInverseAction({
      ...actionBase(
        plan,
        pluginAuthority("plugin-claim", retirement.pluginId, retirement.releaseDigest),
        retirement.claim.relativePath,
      ),
      mutation: "retire-payload",
      prior: fileStateFromDestinationObservation(retirement.prior),
      expectedPost: Object.freeze({ kind: "Absent" }),
    }));
  }
  for (const retirement of plan.directoryRetirements) {
    actions.push(createExportInverseAction({
      ...actionBase(
        plan,
        pluginAuthority("plugin-claim", retirement.pluginId, retirement.releaseDigest),
        mustRelativePath(retirement.relativePath),
      ),
      mutation: "retire-directory",
      prior: directoryPriorFromDestinationObservation(retirement.prior),
      expectedPost: Object.freeze({ kind: "Absent" }),
    }));
  }
  if (plan.ledgerChange) {
    if (plan.current.slot.kind === "Directory") throw new TypeError("Ledger prior is a directory");
    actions.push(createExportInverseAction({
      ...actionBase(
        plan,
        Object.freeze({ kind: "destination-ledger", nextGeneration: plan.nextLedger.body.generation }),
        mustRelativePath(EXPORT_LEDGER_FILENAME),
      ),
      mutation: "write-ledger",
      prior: plan.current.slot.kind === "Absent"
        ? Object.freeze({ kind: "Absent" })
        : fileStateFromDestinationObservation(plan.current.slot),
      expectedPost: fileStateFromBytes(plan.nextLedgerBytes, 0o644, contentDigest(plan.nextLedgerBytes)),
    }));
  }
  return Object.freeze(actions);
}

export async function executeDestinationPlan(
  plan: DestinationExportPlan,
  session: ExportMutationSession,
  resource: ExportDestinationAsyncPort,
  expectedActionEndIndex = session.admittedActionSequence.entries.length,
): Promise<DestinationTransactionResult> {
  const actions = planDestinationInverseActions(plan);
  const steps = actionSteps(plan, actions);
  if (steps === undefined) {
    const primary = failure(
      "UndoAdmissionFailed",
      "destination-action-plan",
      "Service-authored inverse actions do not match the exact destination mutation sequence",
      plan.destination.path,
    );
    const released = await releaseCapturedPlan(plan, resource);
    return released.kind === "Released"
      ? Object.freeze({ kind: "Rejected", failures: singleFailure(primary) })
      : Object.freeze({
        kind: "Unsettled",
        applied: Object.freeze([]),
        failures: Object.freeze({
          kind: "PrimaryAndCleanup",
          primary,
          cleanup: released.kind === "Failed"
            ? released.failure
            : failure(
              "VerificationFailed",
              "destination-release",
              "Unmutated destination capture unexpectedly requires restore",
              plan.destination.path,
            ),
        }),
      });
  }

  const planningRelease = await releaseCapturedPlan(plan, resource);
  if (planningRelease.kind !== "Released") {
    const primary = planningRelease.kind === "Failed"
      ? planningRelease.failure
      : failure(
        "VerificationFailed",
        "destination-release",
        "Unmutated destination capture unexpectedly requires restore",
        plan.destination.path,
      );
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze([]),
      failures: singleFailure(primary),
    });
  }

  const applied: ExportAppliedEvent[] = [];
  for (const step of steps) {
    const staged = await stageAction(session, step.action);
    if ("failure" in staged) {
      return transactionFailure(applied, staged.failure, staged.visibleOrAmbiguous);
    }
    try {
      await hit(session, "AfterInverseStaged", plan.destination.path, step.action.relativePath);
    } catch (error) {
      return rejectStagedBeforeMutation(
        session,
        staged,
        applied,
        failure("FailpointFailed", "AfterInverseStaged", errorMessage(error), step.action.relativePath),
      );
    }

    let capture: ExportDestinationCapture;
    try {
      capture = await resource.capture({
        destination: plan.destination.path,
        readToken: `export-action-${staged.digest}`,
        paths: [step.action.relativePath],
        maxEntries: MAX_ACTION_CAPTURE_ENTRIES,
        maxBytes: MAX_ACTION_CAPTURE_BYTES,
      });
    } catch (error) {
      return rejectStagedBeforeMutation(
        session,
        staged,
        applied,
        resourceFailure(error, "destination-action-capture"),
      );
    }
    const prior = capture.entries[0];
    if (
      capture.canonicalDestination !== plan.destination.path
      || capture.entries.length !== 1
      || prior === undefined
      || prior.path !== step.action.relativePath
      || !observationMatchesPrior(prior, step.action)
    ) {
      return restoreOrRejectAction(
        session,
        staged,
        applied,
        resource,
        capture,
        staged.digest,
        failure(
          "PathChanged",
          "destination-action-prior",
          "Destination action prior differs from its admitted service-authored action",
          step.action.relativePath,
        ),
      );
    }

    let receipt;
    try {
      receipt = await resource.apply({
        destination: plan.destination.path,
        planDigest: staged.digest,
        readToken: capture.readToken,
        captureHandle: capture.handle,
        mutations: [step.mutation],
      });
    } catch (error) {
      return restoreOrRejectAction(
        session,
        staged,
        applied,
        resource,
        capture,
        staged.digest,
        resourceFailure(error, "destination-action-apply"),
      );
    }
    const post = receipt.entries[0];
    if (
      receipt.planDigest !== staged.digest
      || receipt.readToken !== capture.readToken
      || receipt.entries.length !== 1
      || post === undefined
      || post.path !== step.action.relativePath
      || !observationMatchesExpected(post, step.action)
    ) {
      return restoreOrRejectAction(
        session,
        staged,
        applied,
        resource,
        capture,
        staged.digest,
        failure(
          "VerificationFailed",
          "destination-action-post",
          "Applied destination differs from its admitted service-authored action",
          step.action.relativePath,
        ),
      );
    }

    const appliedEvent = event(step.action, staged.digest);
    try {
      if (step.action.mutation === "create-directory") {
        await hit(session, "AfterDirectoriesCreated", plan.destination.path, step.action.relativePath);
      }
    } catch (error) {
      return unsettledVisibleAction(
        applied,
        appliedEvent,
        resource,
        capture,
        staged.digest,
        failure("FailpointFailed", "AfterDirectoriesCreated", errorMessage(error), step.action.relativePath),
      );
    }

    const marked = await markApplied(session, staged, post);
    if (marked !== undefined) {
      return unsettledVisibleAction(applied, appliedEvent, resource, capture, staged.digest, marked);
    }
    applied.push(appliedEvent);
    const settled = await settleActionCapture(resource, capture, staged.digest, "destination-action-settle");
    if (settled !== undefined) {
      return Object.freeze({
        kind: "Unsettled",
        applied: Object.freeze([...applied]),
        failures: singleFailure(settled),
      });
    }
  }
  if (session.admittedActionSequence.nextIndex !== expectedActionEndIndex) {
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze(applied),
      failures: singleFailure(failure(
        "UndoAdmissionFailed",
        "undo-sequence",
        "Destination completed without consuming its exact admitted inverse-action sequence",
      )),
    });
  }
  return Object.freeze({
    kind: "Applied",
    applied: Object.freeze(applied),
    verifiedPaths: Object.freeze(plan.nextLedger.body.scopes
      .flatMap((scope) => scope.files.map((file) => file.relativePath))
      .sort(compareCanonicalText)),
    retiredPaths: Object.freeze(plan.retirements.map((retirement) => retirement.claim.relativePath).sort(compareCanonicalText)),
    preservedPaths: plan.preservedPaths,
  });
}

function actionSteps(
  plan: DestinationExportPlan,
  actions: readonly ExportInverseActionV1[],
): readonly ActionStep[] | undefined {
  if (actions.length !== plan.mutations.length) return undefined;
  const steps: ActionStep[] = [];
  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const mutation = plan.mutations[index];
    if (action === undefined || mutation === undefined || !mutationMatchesAction(mutation, action)) return undefined;
    steps.push(Object.freeze({ action, mutation }));
  }
  return Object.freeze(steps);
}

function mutationMatchesAction(
  mutation: ExportDestinationMutation,
  action: ExportInverseActionV1,
): boolean {
  if (mutation.path !== action.relativePath) return false;
  if (action.mutation === "create-directory") {
    return mutation.kind === "EnsureDirectory"
      && action.expectedPost.kind === "Directory"
      && mutation.mode === action.expectedPost.mode;
  }
  if (action.mutation === "retire-payload") return mutation.kind === "RemoveFile";
  if (action.mutation === "retire-directory") return mutation.kind === "RemoveEmptyDirectory";
  return mutation.kind === "WriteFile"
    && action.expectedPost.kind === "Present"
    && mutation.mode === action.expectedPost.mode
    && contentDigest(mutation.bytes) === action.expectedPost.contentDigest
    && bytesEqual(mutation.bytes, fileStateBytes(action.expectedPost));
}

async function rejectStagedBeforeMutation(
  session: ExportMutationSession,
  staged: StagedAction,
  applied: readonly ExportAppliedEvent[],
  primary: ExportFailure,
): Promise<DestinationTransactionResult> {
  const discarded = await discardStagedActions(session, [staged], primary);
  const failures = discarded === undefined
    ? singleFailure(primary)
    : Object.freeze({ kind: "PrimaryAndCleanup" as const, primary, cleanup: discarded });
  return transactionFailure(applied, failures, discarded !== undefined);
}

type CapturedReleaseResult =
  | Readonly<{ kind: "Released" }>
  | Readonly<{ kind: "RequiresRestore" }>
  | Readonly<{ kind: "Failed"; failure: ExportFailure }>;

async function releaseCapturedPlan(
  plan: DestinationExportPlan,
  resource: ExportDestinationAsyncPort,
): Promise<CapturedReleaseResult> {
  try {
    await resource.release({
      destination: plan.destination.path,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
    });
    return Object.freeze({ kind: "Released" });
  } catch (error) {
    if (isResourceFailure(error) && error.operation === "release" && error.reason === "HandleState") {
      return Object.freeze({ kind: "RequiresRestore" });
    }
    return Object.freeze({ kind: "Failed", failure: resourceFailure(error, "destination-release") });
  }
}

async function restoreOrRejectAction(
  session: ExportMutationSession,
  staged: StagedAction,
  applied: readonly ExportAppliedEvent[],
  resource: ExportDestinationAsyncPort,
  capture: ExportDestinationCapture,
  planDigest: string,
  primary: ExportFailure,
): Promise<DestinationTransactionResult> {
  const released = await releaseCapturedCapture(resource, capture);
  let cleanup = released.kind === "Failed" ? released.failure : undefined;
  if (released.kind === "RequiresRestore") {
    try {
      await resource.restore({
        destination: capture.canonicalDestination,
        planDigest,
        readToken: capture.readToken,
        captureHandle: capture.handle,
      });
      cleanup = await settleActionCapture(resource, capture, planDigest, "destination-action-settle-restored");
    } catch (error) {
      cleanup = resourceFailure(error, "destination-action-restore");
    }
  }
  if (cleanup !== undefined) {
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze([...applied]),
      failures: Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup }),
    });
  }
  return rejectStagedBeforeMutation(session, staged, applied, primary);
}

async function unsettledVisibleAction(
  applied: readonly ExportAppliedEvent[],
  appliedEvent: ExportAppliedEvent,
  resource: ExportDestinationAsyncPort,
  capture: ExportDestinationCapture,
  planDigest: string,
  primary: ExportFailure,
): Promise<DestinationTransactionResult> {
  const exactApplied = Object.freeze([...applied, appliedEvent]);
  const cleanup = await settleActionCapture(
    resource,
    capture,
    planDigest,
    "destination-action-settle-unsettled",
  );
  return Object.freeze({
    kind: "Unsettled",
    applied: exactApplied,
    failures: cleanup === undefined
      ? singleFailure(primary)
      : Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup }),
  });
}

async function settleActionCapture(
  resource: ExportDestinationAsyncPort,
  capture: ExportDestinationCapture,
  planDigest: string,
  phase: string,
): Promise<ExportFailure | undefined> {
  try {
    await resource.settle({
      destination: capture.canonicalDestination,
      planDigest,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
    return undefined;
  } catch (error) {
    return resourceFailure(error, phase);
  }
}

async function releaseCapturedCapture(
  resource: ExportDestinationAsyncPort,
  capture: ExportDestinationCapture,
): Promise<CapturedReleaseResult> {
  try {
    await resource.release({
      destination: capture.canonicalDestination,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
    return Object.freeze({ kind: "Released" });
  } catch (error) {
    if (isResourceFailure(error) && error.operation === "release" && error.reason === "HandleState") {
      return Object.freeze({ kind: "RequiresRestore" });
    }
    return Object.freeze({ kind: "Failed", failure: resourceFailure(error, "destination-action-release") });
  }
}

function transactionFailure(
  applied: readonly ExportAppliedEvent[],
  failures: ExportFailureSet,
  visibleOrAmbiguous: boolean,
): DestinationTransactionResult {
  return visibleOrAmbiguous || applied.length > 0
    ? Object.freeze({ kind: "Unsettled", applied: Object.freeze([...applied]), failures })
    : Object.freeze({ kind: "Rejected", failures });
}

async function stageAction(
  session: ExportMutationSession,
  action: ExportInverseActionV1,
): Promise<StagedAction | Readonly<{
  failure: ExportFailureSet;
  visibleOrAmbiguous: boolean;
}>> {
  const digest = exportInverseActionDigest(action);
  const sequence = session.admittedActionSequence;
  const admitted = sequence.entries[sequence.nextIndex];
  if (admitted === undefined || admitted.actionDigest !== digest) return Object.freeze({
    failure: singleFailure(failure(
      "UndoAdmissionFailed",
      "undo-stage",
      "Planned inverse action differs from the next position admitted by the controller",
    )),
    visibleOrAmbiguous: false,
  });
  try {
    const result = await session.undoSession.stage({ actionHandle: admitted.actionHandle });
    if (result.kind === "Accepted") {
      session.capsule.generation = result.generation;
      sequence.nextIndex += 1;
      return Object.freeze({ action, digest, actionHandle: admitted.actionHandle });
    }
    if (result.kind === "Unsettled") {
      session.capsule.generation = result.generation;
      session.capsule.synchronization = result.synchronization;
    }
    return Object.freeze({
      failure: singleFailure(exportUndoFailure("UndoStageFailed", "undo-stage", result.failure)),
      visibleOrAmbiguous: result.kind === "Unsettled",
    });
  } catch (error) {
    return Object.freeze({
      failure: singleFailure(failure("UndoStageFailed", "undo-stage", `Undo stage outcome is unknown: ${errorMessage(error)}`)),
      visibleOrAmbiguous: true,
    });
  }
}

async function markApplied(
  session: ExportMutationSession,
  staged: StagedAction,
  post: ExportDestinationEntryObservation,
): Promise<ExportFailure | undefined> {
  const observation = createExportAppliedObservation(staged.digest, observedDestinationEntry(post));
  try {
    const result = await session.undoSession.markApplied({ actionHandle: staged.actionHandle, observedPost: observation });
    if (result.kind === "Accepted") {
      session.capsule.generation = result.generation;
      return undefined;
    }
    if (result.kind === "Unsettled") {
      session.capsule.generation = result.generation;
      session.capsule.synchronization = result.synchronization;
    }
    return exportUndoFailure("UndoStageFailed", "undo-mark-applied", result.failure);
  } catch (error) {
    return failure("UndoStageFailed", "undo-mark-applied", `Undo applied-state outcome is unknown: ${errorMessage(error)}`);
  }
}

async function discardStagedActions(
  session: ExportMutationSession,
  staged: readonly StagedAction[],
  primary: ExportFailure,
): Promise<ExportFailure | undefined> {
  for (const action of [...staged].reverse()) {
    try {
      const result = await session.undoSession.discardStaged({ actionHandle: action.actionHandle });
      if (result.kind === "Accepted") {
        session.capsule.generation = result.generation;
        continue;
      }
      if (result.kind === "Unsettled") {
        session.capsule.generation = result.generation;
        session.capsule.synchronization = result.synchronization;
      }
      return exportUndoFailure("UndoStageFailed", "undo-discard", result.failure);
    } catch (error) {
      return failure(
        "UndoStageFailed",
        "undo-discard",
        `Undo discard outcome is unknown after ${primary.code}: ${errorMessage(error)}`,
      );
    }
  }
  return undefined;
}

function observationMatchesPrior(
  observed: ExportDestinationEntryObservation,
  action: ExportInverseActionV1,
): boolean {
  if (action.prior.kind === "Absent") return observed.kind === "Absent";
  if (action.prior.kind === "Directory") {
    return observed.kind === "Directory"
      && observed.mode === action.prior.mode
      && observed.stat.dev === action.prior.dev
      && observed.stat.ino === action.prior.ino
      && observed.stat.birthtimeNs === action.prior.birthtimeNs;
  }
  return observed.kind === "File"
    && observed.mode === action.prior.mode
    && contentDigest(observed.bytes) === action.prior.contentDigest
    && bytesEqual(observed.bytes, fileStateBytes(action.prior));
}

function observationMatchesExpected(
  observed: ExportDestinationEntryObservation,
  action: ExportInverseActionV1,
): boolean {
  if (action.expectedPost.kind === "Absent") return observed.kind === "Absent";
  if (action.expectedPost.kind === "Directory") {
    return observed.kind === "Directory" && observed.mode === action.expectedPost.mode;
  }
  return observed.kind === "File"
    && observed.mode === action.expectedPost.mode
    && contentDigest(observed.bytes) === action.expectedPost.contentDigest;
}

function actionBase(
  plan: DestinationExportPlan,
  authority: ExportActionAuthorityV1,
  relativePath: ReleaseRelativePath,
): Pick<ExportInverseActionV1, "canonicalDestination" | "layout" | "ledgerGeneration" | "ledgerDigest" | "authority" | "relativePath"> {
  return {
    canonicalDestination: plan.destination.path,
    layout: plan.nextLedger.body.layout,
    ledgerGeneration: plan.current.ledger.body.generation,
    ledgerDigest: plan.current.ledger.ledgerDigest,
    authority,
    relativePath,
  };
}

function pluginAuthority(
  kind: "plugin-claim" | "planned-adoption",
  pluginId: PluginId,
  releaseDigest: ReleaseDigest,
): ExportActionAuthorityV1 {
  return Object.freeze({ kind, pluginId, releaseDigest });
}

function event(action: ExportInverseActionV1, actionDigest: ReturnType<typeof exportInverseActionDigest>): ExportAppliedEvent {
  const mutation: ExportAppliedEvent["mutation"] = action.mutation === "create-directory"
    ? "CreateDirectory"
    : action.mutation === "write-payload"
      ? "WritePayload"
      : action.mutation === "retire-payload"
        ? "RetirePayload"
        : action.mutation === "retire-directory"
          ? "RetireDirectory"
          : "WriteLedger";
  const pluginId = action.authority.kind === "destination-ledger" ? "@ledger" : action.authority.pluginId;
  return Object.freeze({ mutation, pluginId, relativePath: action.relativePath, actionDigest });
}

function resourceFailure(error: unknown, phase: string): ExportFailure {
  if (isResourceFailure(error)) {
    const code: ExportFailure["code"] = error.reason === "IdentityChanged"
      ? "PathChanged"
      : error.reason === "CleanupFailed"
        ? "TemporaryCleanupFailed"
        : error.operation === "apply"
          ? "MutationFailed"
          : "VerificationFailed";
    return failure(code, `${phase}:${error.operation}:${error.reason}`, error.detail, error.path);
  }
  return failure("MutationFailed", phase, errorMessage(error));
}

function isResourceFailure(error: unknown): error is ExportDestinationResourceFailure {
  return typeof error === "object" && error !== null && "_tag" in error && error._tag === "ExportDestinationFailure";
}

function singleFailure(primary: ExportFailure): ExportFailureSet {
  return Object.freeze({ kind: "PrimaryOnly", primary });
}

function mustRelativePath(input: string): ReleaseRelativePath {
  const parsed = parseReleaseRelativePath(input);
  if (!parsed.ok) throw new TypeError(`Derived export path is unsafe: ${input}`);
  return parsed.value;
}

function exportUndoFailure(
  code: "UndoStageFailed",
  phase: string,
  input: UndoFailure,
): ExportFailure {
  const cleanup = input.cleanup === undefined
    ? ""
    : `; cleanup ${input.cleanup.code}: ${input.cleanup.message} (${input.cleanup.path})`;
  return failure(code, `${phase}:${input.code}`, `${input.message}${cleanup}`, input.path);
}

async function hit(
  session: ExportMutationSession,
  point: ExportFailpoint,
  destination: string,
  relativePath?: string,
): Promise<void> {
  if (session.failpoints === undefined) return;
  await session.failpoints.hit(point, {
    destination,
    ...(relativePath === undefined ? {} : { relativePath }),
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
