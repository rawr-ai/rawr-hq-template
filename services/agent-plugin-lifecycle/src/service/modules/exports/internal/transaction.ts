import type {
  ExportDestinationAsyncPort,
  ExportDestinationEntryObservation,
  ExportDestinationFailure as ExportDestinationResourceFailure,
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
import { failure } from "./filesystem-model";
import {
  createExportAppliedObservation,
  createExportInverseAction,
  directoryPriorFromDestinationObservation,
  exportInverseActionDigest,
  fileStateFromBytes,
  fileStateFromDestinationObservation,
  observedDestinationEntry,
  type ExportActionAuthorityV1,
  type ExportInverseActionV1,
} from "./inverse-action";
import { EXPORT_LEDGER_FILENAME } from "./ledger";
import type { DestinationExportPlan } from "./plan";

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
  const staged: StagedAction[] = [];
  for (const action of actions) {
    const result = await stageAction(session, action);
    if ("failure" in result) {
      const failures = await releaseBeforeApply(plan, resource, result.failure);
      return result.visibleOrAmbiguous
        ? Object.freeze({ kind: "Unsettled", applied: Object.freeze([]), failures })
        : Object.freeze({ kind: "Rejected", failures });
    }
    staged.push(result);
    try {
      await hit(session, "AfterInverseStaged", plan.destination.path, action.relativePath);
    } catch (error) {
      const failures = await releaseBeforeApply(
        plan,
        resource,
        singleFailure(failure("FailpointFailed", "AfterInverseStaged", errorMessage(error), action.relativePath)),
      );
      return Object.freeze({
        kind: "Unsettled",
        applied: Object.freeze([]),
        failures,
      });
    }
  }

  let receipt;
  try {
    receipt = await resource.apply({
      destination: plan.destination.path,
      planDigest: plan.planDigest,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
      mutations: plan.mutations,
    });
  } catch (error) {
    const primary = resourceFailure(error, "destination-apply");
    return restoreRejectedPlan(plan, session, resource, staged, primary);
  }
  if (
    receipt.planDigest !== plan.planDigest
    || receipt.readToken !== plan.capture.readToken
    || receipt.entries.length !== plan.capture.entries.length
  ) {
    return restoreRejectedPlan(
      plan,
      session,
      resource,
      staged,
      failure("VerificationFailed", "destination-apply-receipt", "Destination provider returned a receipt for another exact plan"),
    );
  }

  const postByPath = new Map(receipt.entries.map((entry) => [entry.path, entry]));
  const applied: ExportAppliedEvent[] = [];
  for (const item of staged) {
    const post = postByPath.get(item.action.relativePath);
    if (post === undefined || !observationMatchesExpected(post, item.action)) {
      return unsettledAfterApplied(
        plan,
        resource,
        applied,
        failure("VerificationFailed", "destination-post-observation", "Applied destination differs from its service-authored plan", item.action.relativePath),
      );
    }
    const marked = await markApplied(session, item, post);
    const appliedEvent = event(item.action, item.digest);
    applied.push(appliedEvent);
    if (marked !== undefined) return unsettledAfterApplied(plan, resource, applied, marked);
  }
  if (session.admittedActionSequence.nextIndex !== expectedActionEndIndex) {
    return unsettledAfterApplied(plan, resource, applied, failure(
      "UndoAdmissionFailed",
      "undo-sequence",
      "Destination completed without consuming its exact admitted inverse-action sequence",
    ));
  }
  try {
    await resource.settle({
      destination: plan.destination.path,
      planDigest: plan.planDigest,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
    });
  } catch (error) {
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze(applied),
      failures: singleFailure(resourceFailure(error, "destination-settle")),
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

async function restoreRejectedPlan(
  plan: DestinationExportPlan,
  session: ExportMutationSession,
  resource: ExportDestinationAsyncPort,
  staged: readonly StagedAction[],
  primary: ExportFailure,
): Promise<DestinationTransactionResult> {
  const release = await releaseCapturedPlan(plan, resource);
  if (release.kind === "Released") {
    const discarded = await discardStagedActions(session, staged, primary);
    return discarded === undefined
      ? Object.freeze({ kind: "Rejected", failures: singleFailure(primary) })
      : Object.freeze({
        kind: "Unsettled",
        applied: Object.freeze([]),
        failures: Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup: discarded }),
      });
  }
  if (release.kind === "Failed") {
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze([]),
      failures: Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup: release.failure }),
    });
  }
  try {
    await resource.restore({
      destination: plan.destination.path,
      planDigest: plan.planDigest,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
    });
  } catch (error) {
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze([]),
      failures: Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup: resourceFailure(error, "destination-restore") }),
    });
  }
  const discarded = await discardStagedActions(session, staged, primary);
  try {
    await resource.settle({
      destination: plan.destination.path,
      planDigest: plan.planDigest,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
    });
  } catch (error) {
    return Object.freeze({
      kind: "Unsettled",
      applied: Object.freeze([]),
      failures: Object.freeze({
        kind: "PrimaryAndCleanup",
        primary,
        cleanup: resourceFailure(error, "destination-settle-restored"),
      }),
    });
  }
  return discarded === undefined
    ? Object.freeze({ kind: "Rejected", failures: singleFailure(primary) })
    : Object.freeze({ kind: "Unsettled", applied: Object.freeze([]), failures: Object.freeze({
      kind: "PrimaryAndCleanup",
      primary,
      cleanup: discarded,
    }) });
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

async function releaseBeforeApply(
  plan: DestinationExportPlan,
  resource: ExportDestinationAsyncPort,
  failures: ExportFailureSet,
): Promise<ExportFailureSet> {
  const released = await releaseCapturedPlan(plan, resource);
  if (released.kind === "Released") return failures;
  const cleanup = released.kind === "Failed"
    ? released.failure
    : failure(
      "VerificationFailed",
      "destination-release",
      "Unmutated destination capture unexpectedly requires restore",
      plan.destination.path,
    );
  return failures.kind === "PrimaryAndCleanup"
    ? failures
    : Object.freeze({ kind: "PrimaryAndCleanup", primary: failures.primary, cleanup });
}

async function unsettledAfterApplied(
  plan: DestinationExportPlan,
  resource: ExportDestinationAsyncPort,
  applied: readonly ExportAppliedEvent[],
  primary: ExportFailure,
): Promise<DestinationTransactionResult> {
  let cleanup: ExportFailure | undefined;
  try {
    await resource.settle({
      destination: plan.destination.path,
      planDigest: plan.planDigest,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
    });
  } catch (error) {
    cleanup = resourceFailure(error, "destination-settle-unsettled");
  }
  return Object.freeze({
    kind: "Unsettled",
    applied: Object.freeze([...applied]),
    failures: cleanup === undefined
      ? singleFailure(primary)
      : Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup }),
  });
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
