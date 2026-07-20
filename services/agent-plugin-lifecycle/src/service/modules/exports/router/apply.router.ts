import { isAbsolute, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  compareCanonicalText,
  type ArtifactRef,
} from "../../../shared/release/index";
import type { ArtifactReader } from "../../../model/dependencies/releases";

import {
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  type ExportAppliedEvent,
  type ExportAgentPluginsRequest,
  type ExportAgentPluginsResult,
  type ExportDestinationResult,
  type ExportFailpoints,
  type ExportFailure,
  type ExportFailureSet,
  type ExportReleaseResult,
  type ExportSynchronizationResult,
  type UndoApplyingSession,
  type UndoBeginResult,
  type UndoCandidateInput,
  type UndoFailure,
  type UndoReleaseResult,
  type UndoSynchronizationResult,
} from "../model/dto/export-lifecycle";
import {
  ExportFilesystemError,
  failure,
  toFilesystemError,
} from "../model/dto/filesystem";
import { renderExportSelection, type RenderedExportSelection } from "../model/policy/layout";
import { pathsOverlap, verifyKnownNativeHomesSnapshot } from "../model/policy/native-homes";
import {
  buildDestinationExportPlan,
  type DestinationExportPlan,
} from "../model/policy/plan";
import {
  exportInverseActionDigest,
  type ExportInverseActionV1,
} from "../model/policy/inverse-action";
import {
  planDestinationInverseActions,
  executeDestinationPlan,
  type DestinationTransactionResult,
  type ExportMutationSession,
} from "./transaction";
import type {
  ExportDestinationRuntime,
  ExportDestinationResourceFailure,
  ExportLifecycleHostRuntime,
} from "../ports";
import { module } from "../module";

export const apply = module.apply.handler(async ({ context, input }) => {
  return executeExportAgentPlugins(input, context.exports);
});

type PreparedDestinationResult =
  | Extract<ExportDestinationResult, { kind: "ReadOnlyConverged" }>
  | Extract<ExportDestinationResult, { kind: "RejectedBeforeMutation" }>;

type PreparedDestination =
  | Readonly<{ kind: "Resolved"; result: PreparedDestinationResult }>
  | Readonly<{ kind: "MutationPlanned"; plan: DestinationExportPlan }>;

interface PreparedMutation {
  readonly plan: DestinationExportPlan;
  readonly actions: readonly ExportInverseActionV1[];
}

interface PreparedExportOperation {
  readonly request: ExportAgentPluginsRequest;
  readonly destinations: readonly PreparedDestination[];
  readonly mutations: readonly [PreparedMutation, ...PreparedMutation[]];
  readonly undoCandidate: UndoCandidateInput;
}

type ExportPreparation =
  | Readonly<{ kind: "Complete"; result: ExportAgentPluginsResult }>
  | Readonly<{ kind: "Prepared"; operation: PreparedExportOperation }>;

type AdmittedLifecycle =
  | Readonly<{
    kind: "RejectedBeforeMutation";
    failure: ExportFailure;
    destinations: readonly ExportDestinationResult[];
  }>
  | Readonly<{
    kind: "MutatedUnsettled";
    pendingCapsuleGeneration: string;
    destinations: readonly ExportDestinationResult[];
  }>
  | Readonly<{
    kind: "MutatedSettled";
    destinations: readonly Exclude<ExportDestinationResult, { kind: "MutatedUnsettled" }>[];
  }>;

type AdmittedExecutionOutcome =
  | Readonly<{ kind: "SessionOpen"; lifecycle: AdmittedLifecycle }>
  | Readonly<{
    kind: "SessionClosed";
    lifecycle: AdmittedLifecycle;
    synchronization: ExportReleaseResult;
  }>;

interface ClosedAdmittedOperation {
  readonly lifecycle: AdmittedLifecycle;
  readonly synchronization: ExportReleaseResult;
}

type AcceptedUndoAdmission = Extract<UndoBeginResult, { kind: "Accepted" }>;

type ExportLifecycleRuntime = ExportLifecycleHostRuntime & Readonly<{
  artifactReader: ArtifactReader;
}>;

async function executeExportAgentPlugins(
  request: ExportAgentPluginsRequest,
  dependencies: ExportLifecycleRuntime,
): Promise<ExportAgentPluginsResult> {
  const preparation = await prepareExportOperation(request, dependencies);
  if (preparation.kind === "Complete") return preparation.result;
  return executePreparedExportOperation(preparation.operation, dependencies);
}

async function prepareExportOperation(
  requestInput: ExportAgentPluginsRequest,
  dependencies: ExportLifecycleRuntime,
): Promise<ExportPreparation> {
  const parsed = admitRequest(requestInput);
  if (!parsed.ok) return completePreparation(rejected(parsed.failure, []));
  const request = parsed.request;

  let nativeRead;
  try {
    nativeRead = await dependencies.knownNativeHomesReader.readCompleteSnapshot();
  } catch (error) {
    return completePreparation(rejected(
      failure("NativeHomesUnavailable", "native-homes-read", errorMessage(error)),
      [],
    ));
  }
  if (nativeRead.kind !== "Verified") return completePreparation(rejected(nativeRead.failure, []));
  const nativeVerification = verifyKnownNativeHomesSnapshot(nativeRead.snapshot);
  if (!nativeVerification.ok) return completePreparation(rejected(nativeVerification.failure, []));

  let artifactRead;
  try {
    artifactRead = await dependencies.artifactReader.read(request.artifactRef);
  } catch (error) {
    return completePreparation(rejected(failure("ArtifactMismatch", "artifact-read", errorMessage(error)), []));
  }
  if (artifactRead.kind === "Missing") {
    return completePreparation(rejected(
      failure("ArtifactMissing", "artifact-read", "Requested immutable artifact is unavailable"),
      [],
    ));
  }
  if (artifactRead.kind === "Mismatch") {
    return completePreparation(rejected(failure(
      "ArtifactMismatch",
      "artifact-read",
      artifactRead.issues.map((issue) => `${issue.code}:artifact`).join(","),
    ), []));
  }
  const selection = renderExportSelection(request.artifactRef, request.mode, request.layout, artifactRead.snapshot);
  if (!selection.ok) return completePreparation(rejected(selection.failure, []));

  const destinations = await prepareDestinations(
    request,
    selection,
    nativeVerification.snapshot.homes.map((home) => home.canonicalPath),
    dependencies.failpoints,
    dependencies.destinationRuntime,
    dependencies.operationId,
  );
  const mutationPreparation = prepareMutations(destinations);
  if (!mutationPreparation.ok) {
    const cleanup = await releasePreparedDestinations(destinations, dependencies.destinationRuntime);
    return completePreparation(aggregatePreflightRejected(
      destinations,
      request.layout,
      mutationPreparation.failure,
      cleanup,
    ));
  }
  const firstMutation = mutationPreparation.mutations[0];
  if (firstMutation === undefined) {
    return completePreparation(resolvedPreparationResult(destinations));
  }
  const mutations: readonly [PreparedMutation, ...PreparedMutation[]] = Object.freeze([
    firstMutation,
    ...mutationPreparation.mutations.slice(1),
  ]);
  const undoCandidate: UndoCandidateInput = Object.freeze({
    owner: "agent-plugin-export",
    ownerProtocolVersion: 1,
    contentAuthority: artifactAuthority(request.artifactRef),
    targets: Object.freeze(mutations
      .map((mutation) => targetBinding(mutation.plan))
      .sort((left, right) => compareCanonicalText(left.canonicalTarget, right.canonicalTarget))),
    actions: Object.freeze(mutations.flatMap((mutation) =>
      mutation.actions.map((action) => Object.freeze({ action })))),
  });
  try {
    const preflight = await dependencies.undoWriter.preflight(undoCandidate);
    if (preflight.kind === "Rejected") {
      const cleanup = await releasePreparedDestinations(destinations, dependencies.destinationRuntime);
      return completePreparation(aggregatePreflightRejected(
        destinations,
        request.layout,
        exportUndoFailure("UndoAdmissionFailed", "undo-preflight", preflight.failure),
        cleanup,
      ));
    }
  } catch (error) {
    const cleanup = await releasePreparedDestinations(destinations, dependencies.destinationRuntime);
    return completePreparation(aggregatePreflightRejected(destinations, request.layout, failure(
      "UndoAdmissionFailed",
      "undo-preflight",
      errorMessage(error),
    ), cleanup));
  }
  return Object.freeze({
    kind: "Prepared",
    operation: Object.freeze({ request, destinations: Object.freeze(destinations), mutations, undoCandidate }),
  });
}

async function prepareDestinations(
  request: ExportAgentPluginsRequest,
  selection: Exclude<RenderedExportSelection, { ok: false }>,
  nativeHomePaths: readonly string[],
  failpoints: ExportFailpoints | undefined,
  destinationRuntime: ExportDestinationRuntime,
  operationId: (() => string) | undefined,
): Promise<PreparedDestination[]> {
  const prepared: PreparedDestination[] = [];
  const canonicalDestinations = new Set<string>();
  for (const requestPath of request.destinations) {
    const overlap = nativeHomePaths.find((homePath) => pathsOverlap(requestPath, homePath));
    if (overlap !== undefined) {
      prepared.push(Object.freeze({
        kind: "Resolved",
        result: rejectedDestination(requestPath, request.layout, failure(
          "NativeHomeOverlap",
          "native-home-overlap",
          "Export destination overlaps a canonical native provider home",
          requestPath,
        )),
      }));
      continue;
    }
    try {
      const planning = await buildDestinationExportPlan({
        destination: requestPath,
        layout: request.layout,
        selection,
        overwritePolicy: request.overwritePolicy,
        readToken: `export-read-${(operationId ?? randomUUID)()}`,
        resource: destinationRuntime,
      });
      if (!planning.ok) {
        prepared.push(Object.freeze({
          kind: "Resolved",
          result: rejectedDestination(requestPath, request.layout, planning.failure),
        }));
        continue;
      }
      const destination = planning.plan.destination;
      if (nativeHomePaths.some((homePath) => pathsOverlap(destination.path, homePath))) {
        const primary = failure(
          "NativeHomeOverlap",
          "native-home-overlap",
          "Canonical export destination overlaps a canonical native provider home",
          destination.path,
        );
        const cleanup = await releaseUnmutatedPlan(planning.plan, destinationRuntime);
        prepared.push(Object.freeze({
          kind: "Resolved",
          result: rejectedDestination(requestPath, request.layout, primary, cleanup),
        }));
        continue;
      }
      if (canonicalDestinations.has(destination.path)) {
        const primary = failure(
          "DuplicateDestination",
          "destination-identity",
          "Destination resolves to an already selected canonical owner",
          requestPath,
        );
        const cleanup = await releaseUnmutatedPlan(planning.plan, destinationRuntime);
        prepared.push(Object.freeze({
          kind: "Resolved",
          result: rejectedDestination(requestPath, request.layout, primary, cleanup),
        }));
        continue;
      }
      canonicalDestinations.add(destination.path);
      try {
        await hitAfterPlan(failpoints, destination.path);
      } catch (error) {
        const primary = toFilesystemError(error).failure;
        const cleanup = await releaseUnmutatedPlan(planning.plan, destinationRuntime);
        prepared.push(Object.freeze({
          kind: "Resolved",
          result: rejectedDestination(requestPath, request.layout, primary, cleanup),
        }));
        continue;
      }
      if (planning.plan.converged) {
        const releaseFailure = await releaseUnmutatedPlan(planning.plan, destinationRuntime);
        if (releaseFailure !== undefined) {
          prepared.push(Object.freeze({
            kind: "Resolved",
            result: rejectedDestination(requestPath, request.layout, releaseFailure),
          }));
          continue;
        }
        prepared.push(Object.freeze({
          kind: "Resolved",
          result: Object.freeze({
            kind: "ReadOnlyConverged",
            destination: destination.path,
            layout: request.layout,
            ledgerGeneration: planning.plan.current.ledger.body.generation,
          }),
        }));
      } else {
        prepared.push(Object.freeze({ kind: "MutationPlanned", plan: planning.plan }));
      }
    } catch (error) {
      prepared.push(Object.freeze({
        kind: "Resolved",
        result: rejectedDestination(requestPath, request.layout, toFilesystemError(error).failure),
      }));
    }
  }
  return prepared;
}

function prepareMutations(destinations: readonly PreparedDestination[]):
  | Readonly<{ ok: true; mutations: PreparedMutation[] }>
  | Readonly<{ ok: false; failure: ExportFailure }> {
  const mutations: PreparedMutation[] = [];
  for (const destination of destinations) {
    if (destination.kind === "Resolved") continue;
    try {
      mutations.push(Object.freeze({
        plan: destination.plan,
        actions: planDestinationInverseActions(destination.plan),
      }));
    } catch (error) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "UndoAdmissionFailed",
          "undo-preflight-plan",
          errorMessage(error),
          destination.plan.destination.path,
        ),
      });
    }
  }
  mutations.sort((left, right) => compareCanonicalText(left.plan.destination.path, right.plan.destination.path));
  return Object.freeze({ ok: true, mutations });
}

async function executePreparedExportOperation(
  operation: PreparedExportOperation,
  dependencies: ExportLifecycleRuntime,
): Promise<ExportAgentPluginsResult> {
  let admission: UndoBeginResult;
  try {
    admission = await dependencies.undoWriter.begin(operation.undoCandidate);
  } catch (error) {
    const beginFailure = failure("UndoAdmissionFailed", "undo-begin", errorMessage(error));
    const cleanup = await releasePreparedDestinations(operation.destinations, dependencies.destinationRuntime);
    return rejected(
      beginFailure,
      destinationsRejectedBy(operation, beginFailure, cleanup),
      Object.freeze({ kind: "ReleaseFailed", failure: beginFailure }),
    );
  }
  if (admission.kind === "Rejected") {
    const beginFailure = exportUndoFailure("UndoAdmissionFailed", "undo-begin", admission.failure);
    const cleanup = await releasePreparedDestinations(operation.destinations, dependencies.destinationRuntime);
    return rejected(
      beginFailure,
      destinationsRejectedBy(operation, beginFailure, cleanup),
      exportUndoSynchronization(admission.synchronization),
    );
  }
  if (admission.kind === "Unsettled") {
    const beginFailure = exportUndoFailure("UndoAdmissionFailed", "undo-begin", admission.failure);
    const cleanup = await releasePreparedDestinations(operation.destinations, dependencies.destinationRuntime);
    return unsettledResult(
      destinationsForAdmissionUnsettled(operation, beginFailure, admission.generation, cleanup),
      admission.generation,
      exportUndoRelease(admission.synchronization),
    );
  }
  const closed = await runAdmittedExportOperation(operation, admission, dependencies);
  return admittedResult(closed);
}

async function runAdmittedExportOperation(
  operation: PreparedExportOperation,
  admission: AcceptedUndoAdmission,
  dependencies: ExportLifecycleRuntime,
): Promise<ClosedAdmittedOperation> {
  return withUndoSessionFinalizationGuard(admission.session, async (undoSession) => {
    const admittedActionSequence = createAdmittedActionSequence(operation, admission);
    if (admittedActionSequence === undefined) {
      return abortInvalidAdmission(
        operation,
        undoSession,
        admission.generation,
        dependencies.destinationRuntime,
      );
    }
    const session: ExportMutationSession = Object.freeze({
      capsule: { generation: admission.generation, synchronization: null },
      undoSession,
      admittedActionSequence,
      ...(dependencies.failpoints === undefined ? {} : { failpoints: dependencies.failpoints }),
      ...(dependencies.operationId === undefined ? {} : { operationId: dependencies.operationId }),
    });
    const outcome = await executeAdmittedMutations(
      operation,
      session,
      dependencies.destinationRuntime,
    );
    if (outcome.kind === "SessionClosed") return outcome;
    return Object.freeze({
      lifecycle: outcome.lifecycle,
      synchronization: await suspendSession(undoSession),
    });
  });
}

function createAdmittedActionSequence(
  operation: PreparedExportOperation,
  admission: AcceptedUndoAdmission,
): ExportMutationSession["admittedActionSequence"] | undefined {
  const expectedDigests = operation.mutations.flatMap((mutation) => mutation.actions.map(exportInverseActionDigest));
  const handles = admittedActionHandles(admission.admittedActions);
  if (handles === undefined) return undefined;
  const admittedValid = handles.length === expectedDigests.length
    && new Set(handles).size === handles.length;
  if (!admittedValid) return undefined;
  const entries: ExportMutationSession["admittedActionSequence"]["entries"][number][] = [];
  for (let index = 0; index < expectedDigests.length; index += 1) {
    const actionDigest = expectedDigests[index];
    const actionHandle = handles[index];
    if (actionDigest === undefined || actionHandle === undefined) return undefined;
    entries.push(Object.freeze({ actionDigest, actionHandle }));
  }
  return {
    entries: Object.freeze(entries),
    nextIndex: 0,
  };
}

function admittedActionHandles(input: unknown): readonly string[] | undefined {
  if (!isUnknownArray(input)) return undefined;
  const handles: string[] = [];
  for (const entry of input) {
    if (
      typeof entry !== "object"
      || entry === null
      || Array.isArray(entry)
      || !("actionHandle" in entry)
    ) return undefined;
    const actionHandle = entry.actionHandle;
    if (typeof actionHandle !== "string" || actionHandle.length === 0) return undefined;
    handles.push(actionHandle);
  }
  return Object.freeze(handles);
}

function isUnknownArray(input: unknown): input is readonly unknown[] {
  return Array.isArray(input);
}

async function abortInvalidAdmission(
  operation: PreparedExportOperation,
  session: UndoApplyingSession,
  generation: string,
  destinationRuntime: ExportDestinationRuntime,
): Promise<ClosedAdmittedOperation> {
  const validationFailure = failure(
    "UndoAdmissionFailed",
    "undo-begin",
    "Undo admission did not return one ordered opaque handle for every planned action",
  );
  const resourceCleanup = await releasePreparedDestinations(operation.destinations, destinationRuntime);
  const abort = await abortSession(session, generation);
  if (abort.kind === "Aborted") {
    return Object.freeze({
      lifecycle: rejectedLifecycle(
        validationFailure,
        destinationsRejectedBy(operation, validationFailure, resourceCleanup),
      ),
      synchronization: exportUndoRelease(abort.synchronization),
    });
  }
  const abortFailures = appendCleanup(
    Object.freeze({ kind: "PrimaryOnly", primary: validationFailure }),
    combineCleanupFailures(abort.failure, resourceCleanup),
  );
  const destinations = operation.destinations.map((destination) => {
    if (destination.kind === "Resolved") return destination.result;
    if (destination.plan === operation.mutations[0].plan) {
      return unsettledDestination(destination.plan, [], abortFailures, abort.generation);
    }
    return aggregateBarrier(destination.plan, "Aggregate undo admission could not be aborted cleanly");
  });
  return Object.freeze({
    lifecycle: unsettledLifecycle(destinations, abort.generation),
    synchronization: exportUndoRelease(abort.synchronization),
  });
}

async function executeAdmittedMutations(
  operation: PreparedExportOperation,
  session: ExportMutationSession,
  destinationRuntime: ExportDestinationRuntime,
): Promise<AdmittedExecutionOutcome> {
  let actionEnd = 0;
  const transactions = new Map<DestinationExportPlan, DestinationTransactionResult>();
  let stopped: Readonly<{
    mutation: PreparedMutation;
    transaction: Exclude<DestinationTransactionResult, { kind: "Applied" }>;
    mutationIndex: number;
  }> | undefined;
  for (let mutationIndex = 0; mutationIndex < operation.mutations.length; mutationIndex += 1) {
    const mutation = operation.mutations[mutationIndex]!;
    actionEnd += mutation.actions.length;
    const transaction = await executeDestinationPlan(
      mutation.plan,
      session,
      destinationRuntime,
      actionEnd,
    );
    transactions.set(mutation.plan, transaction);
    if (transaction.kind !== "Applied") {
      stopped = Object.freeze({ mutation, transaction, mutationIndex });
      break;
    }
  }
  if (stopped !== undefined) {
    const cleanup = await releasePreparedMutations(
      operation.mutations.slice(stopped.mutationIndex + 1),
      destinationRuntime,
    );
    if (cleanup !== undefined) {
      const transaction = appendTransactionCleanup(stopped.transaction, cleanup);
      transactions.set(stopped.mutation.plan, transaction);
      stopped = Object.freeze({ ...stopped, transaction });
    }
  }
  if (stopped?.transaction.kind === "Unsettled") {
    const lifecycle = transactionUnsettledLifecycle(operation, transactions, session.capsule.generation);
    return session.capsule.synchronization === null
      ? Object.freeze({ kind: "SessionOpen", lifecycle })
      : Object.freeze({
        kind: "SessionClosed",
        lifecycle,
        synchronization: exportUndoRelease(session.capsule.synchronization),
      });
  }
  const priorApplied = [...transactions.values()].some((transaction) => (
    transaction.kind === "Applied" && transaction.applied.length > 0
  ));
  if (stopped?.transaction.kind === "Rejected" && !priorApplied) {
    const abort = await abortSession(session.undoSession, session.capsule.generation);
    if (abort.kind === "Aborted") {
      return Object.freeze({
        kind: "SessionClosed",
        lifecycle: rejectedLifecycle(
          stopped.transaction.failures.primary,
          destinationsAfterUntouchedRejection(operation, stopped.mutation, stopped.transaction),
        ),
        synchronization: exportUndoRelease(abort.synchronization),
      });
    }
    const abortedFailures = appendCleanup(stopped.transaction.failures, abort.failure);
    return Object.freeze({
      kind: "SessionClosed",
      lifecycle: unsettledLifecycle(
        destinationsAfterAbortFailure(operation, stopped.mutation, abortedFailures, abort.generation),
        abort.generation,
      ),
      synchronization: exportUndoRelease(abort.synchronization),
    });
  }
  return settleAdmittedMutations(operation, session, transactions);
}

function appendTransactionCleanup(
  transaction: Exclude<DestinationTransactionResult, { kind: "Applied" }>,
  cleanup: ExportFailure,
): Exclude<DestinationTransactionResult, { kind: "Applied" }> {
  const failures = appendCleanup(transaction.failures, cleanup);
  return transaction.kind === "Rejected"
    ? Object.freeze({ kind: "Rejected", failures })
    : Object.freeze({ kind: "Unsettled", applied: transaction.applied, failures });
}

async function settleAdmittedMutations(
  operation: PreparedExportOperation,
  session: ExportMutationSession,
  transactions: ReadonlyMap<DestinationExportPlan, DestinationTransactionResult>,
): Promise<AdmittedExecutionOutcome> {
  let settlement;
  try {
    settlement = await session.undoSession.settle();
  } catch (error) {
    const message = `Undo settlement outcome is unknown: ${errorMessage(error)}`;
    const settlementFailure = failure(
      "UndoSettlementFailed",
      "undo-settle",
      message,
    );
    return Object.freeze({
      kind: "SessionClosed",
      lifecycle: settlementFailureLifecycle(
        operation,
        transactions,
        settlementFailure,
        session.capsule.generation,
      ),
      synchronization: Object.freeze({
        kind: "ReleaseFailed",
        failure: failure("UndoSettlementFailed", "undo-settle-release", message),
      }),
    });
  }
  if (settlement.kind !== "Accepted") {
    const generation = settlement.kind === "Unsettled" ? settlement.generation : session.capsule.generation;
    const settlementFailure = exportUndoFailure("UndoSettlementFailed", "undo-settle", settlement.failure);
    return Object.freeze({
      kind: "SessionClosed",
      lifecycle: settlementFailureLifecycle(operation, transactions, settlementFailure, generation),
      synchronization: exportUndoRelease(settlement.synchronization),
    });
  }
  return Object.freeze({
    kind: "SessionClosed",
    lifecycle: settledLifecycle(operation, transactions),
    synchronization: exportUndoRelease(settlement.synchronization),
  });
}

function transactionUnsettledLifecycle(
  operation: PreparedExportOperation,
  transactions: ReadonlyMap<DestinationExportPlan, DestinationTransactionResult>,
  generation: string,
): AdmittedLifecycle {
  const destinations = operation.destinations.map((destination) => {
    if (destination.kind === "Resolved") return destination.result;
    const transaction = transactions.get(destination.plan);
    if (transaction?.kind === "Applied") return settledTransactionDestination(destination.plan, transaction);
    if (transaction?.kind === "Unsettled") {
      return unsettledDestination(destination.plan, transaction.applied, transaction.failures, generation);
    }
    return aggregateBarrier(destination.plan, "A prior destination left the aggregate undo candidate unsettled");
  });
  return unsettledLifecycle(destinations, generation);
}

function destinationsAfterUntouchedRejection(
  operation: PreparedExportOperation,
  stoppedMutation: PreparedMutation,
  stoppedTransaction: Extract<DestinationTransactionResult, { kind: "Rejected" }>,
): readonly ExportDestinationResult[] {
  return operation.destinations.map((destination) => {
    if (destination.kind === "Resolved") return destination.result;
    if (destination.plan === stoppedMutation.plan) {
      return rejectedTransactionDestination(destination.plan, stoppedTransaction);
    }
    return aggregateBarrier(destination.plan, "Aggregate execution stopped before any destination mutation");
  });
}

function destinationsAfterAbortFailure(
  operation: PreparedExportOperation,
  stoppedMutation: PreparedMutation,
  failures: ExportFailureSet,
  generation: string,
): readonly ExportDestinationResult[] {
  return operation.destinations.map((destination) => {
    if (destination.kind === "Resolved") return destination.result;
    if (destination.plan === stoppedMutation.plan) {
      return unsettledDestination(destination.plan, [], failures, generation);
    }
    return aggregateBarrier(destination.plan, "Aggregate execution could not abort its untouched candidate");
  });
}

function settlementFailureLifecycle(
  operation: PreparedExportOperation,
  transactions: ReadonlyMap<DestinationExportPlan, DestinationTransactionResult>,
  settlementFailure: ExportFailure,
  generation: string,
): AdmittedLifecycle {
  const settlementFailures = Object.freeze({ kind: "PrimaryOnly" as const, primary: settlementFailure });
  const destinations = operation.destinations.map((destination) => {
    if (destination.kind === "Resolved") return destination.result;
    const transaction = transactions.get(destination.plan);
    if (transaction?.kind === "Applied") {
      return unsettledDestination(destination.plan, transaction.applied, settlementFailures, generation);
    }
    if (transaction?.kind === "Rejected") return rejectedTransactionDestination(destination.plan, transaction);
    return aggregateBarrier(destination.plan, "Aggregate settlement failed before this destination executed");
  });
  return unsettledLifecycle(destinations, generation);
}

function settledLifecycle(
  operation: PreparedExportOperation,
  transactions: ReadonlyMap<DestinationExportPlan, DestinationTransactionResult>,
): AdmittedLifecycle {
  const destinations = operation.destinations.map((destination): Exclude<
    ExportDestinationResult,
    { kind: "MutatedUnsettled" }
  > => {
    if (destination.kind === "Resolved") return destination.result;
    const transaction = transactions.get(destination.plan);
    if (transaction?.kind === "Applied") return settledTransactionDestination(destination.plan, transaction);
    if (transaction?.kind === "Rejected") return rejectedTransactionDestination(destination.plan, transaction);
    return aggregateBarrier(destination.plan, "Aggregate execution stopped after an earlier destination rejection");
  });
  return Object.freeze({ kind: "MutatedSettled", destinations: Object.freeze(destinations) });
}

function admittedResult(closed: ClosedAdmittedOperation): ExportAgentPluginsResult {
  const { lifecycle, synchronization } = closed;
  if (lifecycle.kind === "RejectedBeforeMutation") {
    return rejected(lifecycle.failure, lifecycle.destinations, synchronization);
  }
  if (lifecycle.kind === "MutatedUnsettled") {
    return unsettledResult(lifecycle.destinations, lifecycle.pendingCapsuleGeneration, synchronization);
  }
  return Object.freeze({
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    kind: "MutatedSettled",
    destinations: lifecycle.destinations,
    synchronization,
  });
}

function rejectedLifecycle(
  failureValue: ExportFailure,
  destinations: readonly ExportDestinationResult[],
): AdmittedLifecycle {
  return Object.freeze({
    kind: "RejectedBeforeMutation",
    failure: failureValue,
    destinations: Object.freeze([...destinations]),
  });
}

function unsettledLifecycle(
  destinations: readonly ExportDestinationResult[],
  generation: string,
): AdmittedLifecycle {
  return Object.freeze({
    kind: "MutatedUnsettled",
    pendingCapsuleGeneration: generation,
    destinations: Object.freeze([...destinations]),
  });
}

function destinationsRejectedBy(
  operation: PreparedExportOperation,
  primary: ExportFailure,
  cleanup?: ExportFailure,
): readonly ExportDestinationResult[] {
  return operation.destinations.map((destination) => destination.kind === "Resolved"
    ? destination.result
    : rejectedDestination(destination.plan.destination.path, operation.request.layout, primary, cleanup));
}

function destinationsForAdmissionUnsettled(
  operation: PreparedExportOperation,
  primary: ExportFailure,
  generation: string,
  cleanup?: ExportFailure,
): readonly ExportDestinationResult[] {
  const failures: ExportFailureSet = cleanup === undefined
    ? Object.freeze({ kind: "PrimaryOnly", primary })
    : Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup });
  return operation.destinations.map((destination) => {
    if (destination.kind === "Resolved") return destination.result;
    if (destination.plan === operation.mutations[0].plan) {
      return unsettledDestination(destination.plan, [], failures, generation);
    }
    return aggregateBarrier(destination.plan, "A prior aggregate undo admission is unsettled");
  });
}

function completePreparation(result: ExportAgentPluginsResult): ExportPreparation {
  return Object.freeze({ kind: "Complete", result });
}

function resolvedPreparationResult(destinations: readonly PreparedDestination[]): ExportAgentPluginsResult {
  const resolved = destinations.flatMap((destination) => destination.kind === "Resolved" ? [destination.result] : []);
  const converged = resolved.flatMap((result) => result.kind === "ReadOnlyConverged" ? [result] : []);
  if (converged.length === resolved.length) {
    return Object.freeze({
      protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
      kind: "ReadOnlyConverged",
      destinations: Object.freeze(converged),
    });
  }
  const firstFailure = resolved.find((result) => result.kind === "RejectedBeforeMutation");
  return rejected(
    firstFailure?.failures.primary ?? failure("MutationFailed", "export", "No destination completed"),
    resolved,
  );
}

async function withUndoSessionFinalizationGuard<T>(
  source: UndoApplyingSession,
  execute: (session: UndoApplyingSession) => Promise<T>,
): Promise<T> {
  let finalizationStarted = false;
  const session: UndoApplyingSession = Object.freeze({
    async stage(input: Parameters<UndoApplyingSession["stage"]>[0]) {
      const result = await source.stage(input);
      if (result.kind === "Unsettled") finalizationStarted = true;
      return result;
    },
    async discardStaged(input: Parameters<UndoApplyingSession["discardStaged"]>[0]) {
      const result = await source.discardStaged(input);
      if (result.kind === "Unsettled") finalizationStarted = true;
      return result;
    },
    async markApplied(input: Parameters<UndoApplyingSession["markApplied"]>[0]) {
      const result = await source.markApplied(input);
      if (result.kind === "Unsettled") finalizationStarted = true;
      return result;
    },
    settle() {
      finalizationStarted = true;
      return source.settle();
    },
    abort() {
      finalizationStarted = true;
      return source.abort();
    },
    suspend() {
      finalizationStarted = true;
      return source.suspend();
    },
  });
  try {
    return await execute(session);
  } catch (error) {
    if (!finalizationStarted) await suspendSession(session);
    throw error;
  }
}

async function suspendSession(session: UndoApplyingSession): Promise<ExportReleaseResult> {
  try {
    const suspended = await session.suspend();
    return suspended.kind === "Released"
      ? Object.freeze({ kind: "Released" })
      : Object.freeze({
        kind: "ReleaseFailed",
        failure: exportUndoFailure("UndoSettlementFailed", "undo-suspend", suspended.failure),
      });
  } catch (error) {
    return Object.freeze({
      kind: "ReleaseFailed",
      failure: failure("UndoSettlementFailed", "undo-suspend", errorMessage(error)),
    });
  }
}

function admitRequest(input: ExportAgentPluginsRequest):
  | Readonly<{ ok: true; request: ExportAgentPluginsRequest }>
  | Readonly<{ ok: false; failure: ExportFailure }> {
  if (!refMatchesMode(input.artifactRef, input.mode)) {
    return invalidRequest("Artifact reference does not match the explicit export mode");
  }
  const destinations: string[] = [];
  for (const destination of input.destinations) {
    if (!isCanonicalAbsolutePath(destination)) return invalidRequest("Every export destination must be an absolute lexical canonical path");
    destinations.push(destination);
  }
  if (new Set(destinations).size !== destinations.length) return invalidRequest("Export destinations contain a duplicate owner");
  for (let index = 0; index < destinations.length; index += 1) {
    for (let peer = index + 1; peer < destinations.length; peer += 1) {
      if (pathsOverlap(destinations[index]!, destinations[peer]!)) {
        return invalidRequest("Export destinations overlap and cannot remain independent state owners");
      }
    }
  }
  return {
    ok: true,
    request: Object.freeze({
      protocolVersion: input.protocolVersion,
      artifactRef: input.artifactRef,
      mode: input.mode,
      layout: input.layout,
      destinations: Object.freeze(destinations),
      overwritePolicy: input.overwritePolicy,
    }),
  };
}

function refMatchesMode(ref: ArtifactRef, mode: ExportAgentPluginsRequest["mode"]): boolean {
  return (mode === "targeted-release" && ref.kind === "release")
    || (mode === "complete-set" && ref.kind === "complete-set");
}

function isCanonicalAbsolutePath(value: string): boolean {
  return isAbsolute(value)
    && value === normalize(value)
    && value === resolve(value)
    && value !== "/";
}

function invalidRequest(message: string): Readonly<{ ok: false; failure: ExportFailure }> {
  return { ok: false, failure: failure("InvalidRequest", "request-parse", message) };
}

function rejectedDestination(
  destination: string,
  layout: ExportAgentPluginsRequest["layout"],
  primary: ExportFailure,
  cleanup?: ExportFailure,
): Extract<ExportDestinationResult, { kind: "RejectedBeforeMutation" }> {
  return Object.freeze({
    kind: "RejectedBeforeMutation",
    destination,
    layout,
    failures: cleanup === undefined
      ? Object.freeze({ kind: "PrimaryOnly", primary })
      : Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup }),
  });
}

function unsettledDestination(
  plan: DestinationExportPlan,
  applied: readonly ExportAppliedEvent[],
  failures: ExportFailureSet,
  generation: string,
): Extract<ExportDestinationResult, { kind: "MutatedUnsettled" }> {
  return Object.freeze({
    kind: "MutatedUnsettled",
    destination: plan.destination.path,
    layout: plan.nextLedger.body.layout,
    applied: Object.freeze([...applied]),
    failures,
    pendingCapsuleGeneration: generation,
    recoveryRequired: true,
  });
}

function settledTransactionDestination(
  plan: DestinationExportPlan,
  transaction: Extract<DestinationTransactionResult, { kind: "Applied" }>,
): Extract<ExportDestinationResult, { kind: "MutatedSettled" }> {
  return Object.freeze({
    kind: "MutatedSettled",
    destination: plan.destination.path,
    layout: plan.nextLedger.body.layout,
    ledgerGeneration: plan.nextLedger.body.generation,
    applied: transaction.applied,
    verifiedPaths: transaction.verifiedPaths,
    retiredPaths: transaction.retiredPaths,
    preservedPaths: transaction.preservedPaths,
  });
}

function rejectedTransactionDestination(
  plan: DestinationExportPlan,
  transaction: Extract<DestinationTransactionResult, { kind: "Rejected" }>,
): Extract<ExportDestinationResult, { kind: "RejectedBeforeMutation" }> {
  return Object.freeze({
    kind: "RejectedBeforeMutation",
    destination: plan.destination.path,
    layout: plan.nextLedger.body.layout,
    failures: transaction.failures,
  });
}

function aggregateBarrier(
  plan: DestinationExportPlan,
  message: string,
): Extract<ExportDestinationResult, { kind: "RejectedBeforeMutation" }> {
  return rejectedDestination(plan.destination.path, plan.nextLedger.body.layout, failure(
    "UndoAdmissionFailed",
    "recovery-barrier",
    message,
    plan.destination.path,
  ));
}

function unsettledResult(
  destinations: readonly ExportDestinationResult[],
  generation: string,
  synchronization: ExportReleaseResult = Object.freeze({ kind: "Released" }),
): Extract<ExportAgentPluginsResult, { kind: "MutatedUnsettled" }> {
  return Object.freeze({
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    kind: "MutatedUnsettled",
    pendingCapsuleGeneration: generation,
    destinations: Object.freeze([...destinations]),
    synchronization,
  });
}

function rejected(
  failureValue: ExportFailure,
  destinations: readonly ExportDestinationResult[],
  synchronization: ExportSynchronizationResult = Object.freeze({ kind: "NotAcquired" }),
): ExportAgentPluginsResult {
  return Object.freeze({
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    kind: "RejectedBeforeMutation",
    failure: failureValue,
    destinations: Object.freeze([...destinations]),
    synchronization,
  });
}

function aggregatePreflightRejected(
  prepared: readonly PreparedDestination[],
  layout: ExportAgentPluginsRequest["layout"],
  preflightFailure: ExportFailure,
  cleanup?: ExportFailure,
): ExportAgentPluginsResult {
  const destinations = prepared.map((item): ExportDestinationResult => item.kind === "Resolved"
    ? item.result
    : rejectedDestination(item.plan.destination.path, layout, preflightFailure, cleanup));
  return rejected(preflightFailure, destinations);
}

function artifactAuthority(ref: ArtifactRef): string {
  return ref.kind === "release" ? ref.releaseDigest : ref.releaseSetDigest;
}

function targetBinding(plan: DestinationExportPlan): Readonly<{
  canonicalTarget: string;
  authorityGeneration: string;
  authorityDigest: DestinationExportPlan["current"]["ledger"]["ledgerDigest"];
}> {
  return Object.freeze({
    canonicalTarget: plan.destination.path,
    authorityGeneration: `elg1_${plan.current.ledger.body.generation}`,
    authorityDigest: plan.current.ledger.ledgerDigest,
  });
}

type AbortSessionResult =
  | Readonly<{ kind: "Aborted"; synchronization: UndoReleaseResult }>
  | Readonly<{
    kind: "Unsettled";
    generation: string;
    failure: ExportFailure;
    synchronization: UndoReleaseResult;
  }>;

async function abortSession(
  session: UndoApplyingSession,
  fallbackGeneration: string,
): Promise<AbortSessionResult> {
  try {
    const result = await session.abort();
    if (result.kind === "Accepted") {
      return Object.freeze({ kind: "Aborted", synchronization: result.synchronization });
    }
    return Object.freeze({
      kind: "Unsettled",
      generation: result.kind === "Unsettled" ? result.generation : fallbackGeneration,
      failure: exportUndoFailure("UndoSettlementFailed", "undo-abort", result.failure),
      synchronization: result.synchronization,
    });
  } catch (error) {
    const message = `Undo abort outcome is unknown: ${errorMessage(error)}`;
    return Object.freeze({
      kind: "Unsettled",
      generation: fallbackGeneration,
      failure: failure("UndoSettlementFailed", "undo-abort", message),
      synchronization: Object.freeze({
        kind: "ReleaseFailed",
        failure: Object.freeze({
          code: "AdmissionUnsafe",
          phase: "undo-abort-release",
          message,
        }),
      }),
    });
  }
}

function appendCleanup(failures: ExportFailureSet, cleanup: ExportFailure | undefined): ExportFailureSet {
  if (cleanup === undefined || failures.kind === "PrimaryAndCleanup") return failures;
  return Object.freeze({ kind: "PrimaryAndCleanup", primary: failures.primary, cleanup });
}

function combineCleanupFailures(
  first: ExportFailure | undefined,
  second: ExportFailure | undefined,
): ExportFailure | undefined {
  if (first === undefined) return second;
  if (second === undefined) return first;
  return failure(
    "VerificationFailed",
    "pre-mutation-cleanup",
    `${first.phase}: ${first.message}; ${second.phase}: ${second.message}`,
    first.path ?? second.path,
  );
}

function exportUndoFailure(
  code: "UndoAdmissionFailed" | "UndoSettlementFailed",
  phase: string,
  input: UndoFailure,
): ExportFailure {
  const cleanup = input.cleanup === undefined
    ? ""
    : `; cleanup ${input.cleanup.code}: ${input.cleanup.message} (${input.cleanup.path})`;
  return failure(code, `${phase}:${input.code}`, `${input.message}${cleanup}`, input.path);
}

function exportUndoRelease(input: UndoReleaseResult): ExportReleaseResult {
  return input.kind === "Released"
    ? Object.freeze({ kind: "Released" })
    : Object.freeze({
      kind: "ReleaseFailed",
      failure: exportUndoFailure("UndoSettlementFailed", "undo-release", input.failure),
    });
}

function exportUndoSynchronization(input: UndoSynchronizationResult): ExportSynchronizationResult {
  return input.kind === "NotAcquired"
    ? Object.freeze({ kind: "NotAcquired" })
    : exportUndoRelease(input);
}

async function hitAfterPlan(failpoints: ExportFailpoints | undefined, destination: string): Promise<void> {
  if (failpoints === undefined) return;
  try {
    await failpoints.hit("AfterPlan", { destination });
  } catch (error) {
    throw new ExportFilesystemError(failure("FailpointFailed", "AfterPlan", errorMessage(error), destination));
  }
}

async function releaseUnmutatedPlan(
  plan: DestinationExportPlan,
  destinationRuntime: ExportDestinationRuntime,
): Promise<ExportFailure | undefined> {
  try {
    await destinationRuntime.release({
      destination: plan.destination.path,
      readToken: plan.capture.readToken,
      captureHandle: plan.capture.handle,
    });
    return undefined;
  } catch (error) {
    if (isDestinationResourceFailure(error)) {
      return failure(
        error.reason === "IdentityChanged" ? "PathChanged" : "VerificationFailed",
        `destination-release:${error.reason}`,
        error.detail,
        error.path,
      );
    }
    return failure("VerificationFailed", "destination-release", errorMessage(error), plan.destination.path);
  }
}

async function releasePreparedDestinations(
  destinations: readonly PreparedDestination[],
  destinationRuntime: ExportDestinationRuntime,
): Promise<ExportFailure | undefined> {
  const failures: ExportFailure[] = [];
  for (const destination of destinations) {
    if (destination.kind === "Resolved") continue;
    const releaseFailure = await releaseUnmutatedPlan(destination.plan, destinationRuntime);
    if (releaseFailure !== undefined) failures.push(releaseFailure);
  }
  if (failures.length === 0) return undefined;
  if (failures.length === 1) return failures[0];
  return failure(
    "VerificationFailed",
    "destination-release-aggregate",
    failures.map((item) => `${item.phase}: ${item.message}`).join("; "),
  );
}

async function releasePreparedMutations(
  mutations: readonly PreparedMutation[],
  destinationRuntime: ExportDestinationRuntime,
): Promise<ExportFailure | undefined> {
  return releasePreparedDestinations(
    mutations.map((mutation) => Object.freeze({ kind: "MutationPlanned" as const, plan: mutation.plan })),
    destinationRuntime,
  );
}

function isDestinationResourceFailure(error: unknown): error is ExportDestinationResourceFailure {
  return typeof error === "object" && error !== null && "_tag" in error && error._tag === "ExportDestinationFailure";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
