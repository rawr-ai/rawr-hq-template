import { randomUUID } from "node:crypto";

import {
  compareCanonicalText,
  contentDigest,
  parseReleaseRelativePath,
  type PluginId,
  type ReleaseDigest,
  type ReleaseRelativePath,
} from "@rawr/agent-plugin-lifecycle/release";

import {
  EXPORT_LEDGER_FILENAME,
  createExportAppliedObservation,
  createExportInverseAction,
  directoryPriorFromCaptured,
  exportInverseActionDigest,
  failure,
  fileStateFromBytes,
  fileStateFromCaptured,
  observedDirectory,
  observedFile,
  toFilesystemError,
  visibleDirectoryMode,
  visibleFileMode,
  ExportFilesystemError,
  type DestinationExportPlan,
  type ExportAppliedEvent,
  type ExportFailpoint,
  type ExportFailpoints,
  type ExportFailure,
  type ExportFailureSet,
  type UndoApplyingSession,
  type UndoFailure,
  type UndoReleaseResult,
  type ExportActionAuthorityV1,
  type ExportInverseActionV1,
  type ExportObservedEntryStateV1,
} from "@rawr/agent-plugin-lifecycle/ports/exports";
import {
  LEDGER_TEMP_PREFIX,
  PAYLOAD_TEMP_PREFIX,
  captureEmptyDirectory,
  captureExistingDirectory,
  captureOpenedTemporary,
  capturePath,
  cleanupOwnedTemporary,
  closeTemporary,
  commitTemporary,
  ensureDirectories,
  openPrivateTemporary,
  revalidateCapturedFile,
  removeCapturedEmptyDirectory,
  unlinkCapturedFile,
  verifyOwnedTemporary,
  verifyPathAbsent,
  verifyPublishedFile,
  writeOpenedTemporary,
  type CapturedPath,
  type CapturedDirectory,
  type CapturedRegularFile,
  type OpenedTemporary,
  type OwnedTemporary,
  type PublishedFileIdentity,
} from "./node-filesystem";
import { revalidateCapturedLedger } from "./node-plan";

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

interface ActionFailure {
  readonly failures: ExportFailureSet;
  readonly visibleOrAmbiguous: boolean;
  readonly appliedEvent?: ExportAppliedEvent;
}

export async function executeDestinationPlan(
  plan: DestinationExportPlan,
  session: ExportMutationSession,
  expectedActionEndIndex = session.admittedActionSequence.entries.length,
): Promise<DestinationTransactionResult> {
  const applied: ExportAppliedEvent[] = [];
  const retiredPaths: string[] = [];
  const createdDirectoryEvents = new Set<string>();
  const operationPublishedFiles = new Map<string, CapturedRegularFile>();
  const operationCreatedDirectories = new Map<string, CapturedDirectory>();

  for (const write of plan.writes) {
    const authority = pluginAuthority(write.authority, write.file.pluginId, write.authorityReleaseDigest);
    for (const directory of write.createdDirectories) {
      if (createdDirectoryEvents.has(directory)) continue;
      const relativePath = mustRelativePath(directory);
      const action = createExportInverseAction({
        ...actionBase(plan, authority, relativePath),
        mutation: "create-directory",
        prior: Object.freeze({ kind: "Absent" }),
        expectedPost: Object.freeze({ kind: "Directory", mode: 0o755 }),
      });
      const outcome = await applyDirectoryCreation(plan, session, action, write.file.pluginId);
      if (outcome.failure !== undefined) return failedResult(applied, outcome.failure);
      applied.push(outcome.event);
      operationCreatedDirectories.set(directory, outcome.createdDirectory);
      createdDirectoryEvents.add(directory);
    }
    const action = createExportInverseAction({
      ...actionBase(plan, authority, write.file.relativePath),
      mutation: "write-payload",
      prior: write.prior.kind === "Absent" ? Object.freeze({ kind: "Absent" }) : fileStateFromCaptured(write.prior.file),
      expectedPost: fileStateFromBytes(write.file.bytes, write.file.mode, write.file.contentDigest),
    });
    const outcome = await applyFileWrite({
      plan,
      session,
      action,
      target: write.prior,
      bytes: write.file.bytes,
      mode: write.file.mode,
      prefix: PAYLOAD_TEMP_PREFIX,
      pluginId: write.file.pluginId,
      eventMutation: "WritePayload",
      commitFailpoint: "BeforePayloadCommit",
      afterCommitFailpoint: "AfterPayloadCommit",
      verifyFailpoint: "BeforePayloadVerify",
    });
    if (outcome.failure !== undefined) return failedResult(applied, outcome.failure);
    applied.push(outcome.event);
    operationPublishedFiles.set(write.file.relativePath, outcome.publishedFile);
  }

  for (const retirement of plan.retirements) {
    const action = createExportInverseAction({
      ...actionBase(
        plan,
        pluginAuthority("plugin-claim", retirement.pluginId, retirement.releaseDigest),
        retirement.claim.relativePath,
      ),
      mutation: "retire-payload",
      prior: fileStateFromCaptured(retirement.prior.file),
      expectedPost: Object.freeze({ kind: "Absent" }),
    });
    const outcome = await applyFileRetirement(plan, session, action, retirement.pluginId, retirement.prior);
    if (outcome.failure !== undefined) return failedResult(applied, outcome.failure);
    applied.push(outcome.event);
    retiredPaths.push(retirement.claim.relativePath);
  }

  for (const retirement of plan.directoryRetirements) {
    const relativePath = retirement.relativePath;
    let directory;
    try {
      directory = await captureEmptyDirectory(plan.destination, relativePath);
    } catch (error) {
      return failedResult(applied, actionFailure(toFilesystemError(error).failure, applied.length > 0));
    }
    if (directory === undefined) {
      return failedResult(applied, actionFailure(failure(
        "ManagedStateMismatch",
        "directory-retirement-emptiness",
        "Preplanned directory retirement is no longer empty",
        relativePath,
      ), applied.length > 0));
    }
    if (
      directory.dev !== retirement.prior.dev
      || directory.ino !== retirement.prior.ino
      || directory.birthtimeNs !== retirement.prior.birthtimeNs
      || visibleDirectoryMode(directory) !== visibleDirectoryMode(retirement.prior)
    ) {
      return failedResult(applied, actionFailure(failure(
        "PathChanged",
        "directory-retirement-identity",
        "Directory retirement candidate changed from its preplanned stable identity",
        relativePath,
      ), applied.length > 0));
    }
    const action = createExportInverseAction({
      ...actionBase(
        plan,
        pluginAuthority("plugin-claim", retirement.pluginId, retirement.releaseDigest),
        mustRelativePath(relativePath),
      ),
      mutation: "retire-directory",
      prior: directoryPriorFromCaptured(retirement.prior),
      expectedPost: Object.freeze({ kind: "Absent" }),
    });
    const outcome = await applyDirectoryRetirement(plan, session, action, retirement.pluginId, directory);
    if (outcome.failure !== undefined) return failedResult(applied, outcome.failure);
    applied.push(outcome.event);
  }

  try {
    await hit(session, "BeforeFinalVerify", plan.destination.path);
    await verifyDestinationClaims(plan, operationPublishedFiles, operationCreatedDirectories);
  } catch (error) {
    return failedResult(applied, actionFailure(toFilesystemError(error).failure, applied.length > 0));
  }

  if (plan.ledgerChange) {
    const ledgerPath = mustRelativePath(EXPORT_LEDGER_FILENAME);
    const action = createExportInverseAction({
      ...actionBase(plan, Object.freeze({
        kind: "destination-ledger",
        nextGeneration: plan.nextLedger.body.generation,
      }), ledgerPath),
      mutation: "write-ledger",
      prior: plan.current.slot.kind === "Absent"
        ? Object.freeze({ kind: "Absent" })
        : fileStateFromCaptured(plan.current.slot.file),
      expectedPost: fileStateFromBytes(
        plan.nextLedgerBytes,
        0o644,
        // The action file state needs the release content-digest domain as its exact byte binding.
        // The ledger's own digest remains independently bound in the action authority.
        contentDigest(plan.nextLedgerBytes),
      ),
    });
    const outcome = await applyFileWrite({
      plan,
      session,
      action,
      target: plan.current.slot,
      bytes: plan.nextLedgerBytes,
      mode: 0o644,
      prefix: LEDGER_TEMP_PREFIX,
      pluginId: "@ledger",
      eventMutation: "WriteLedger",
      commitFailpoint: "BeforeLedgerCommit",
      afterCommitFailpoint: "AfterLedgerCommit",
      verifyFailpoint: undefined,
      beforeCommit: () => verifyDestinationClaims(plan, operationPublishedFiles, operationCreatedDirectories),
    });
    if (outcome.failure !== undefined) return failedResult(applied, outcome.failure);
    applied.push(outcome.event);
  }

  try {
    await verifyDestinationClaims(plan, operationPublishedFiles, operationCreatedDirectories);
  } catch (error) {
    return failedResult(applied, actionFailure(toFilesystemError(error).failure, applied.length > 0));
  }
  if (session.admittedActionSequence.nextIndex !== expectedActionEndIndex) {
    return failedResult(applied, actionFailure(failure(
      "UndoAdmissionFailed",
      "undo-sequence",
      "Destination completed without consuming its exact admitted inverse-action sequence",
    ), true));
  }

  return Object.freeze({
    kind: "Applied",
    applied: Object.freeze(applied),
    verifiedPaths: Object.freeze([...plan.nextLedger.body.scopes
      .flatMap((scope) => scope.files.map((file) => file.relativePath))
      .sort(compareCanonicalText)]),
    retiredPaths: Object.freeze(retiredPaths.sort(compareCanonicalText)),
    preservedPaths: plan.preservedPaths,
  });
}

async function applyDirectoryCreation(
  plan: DestinationExportPlan,
  session: ExportMutationSession,
  action: ExportInverseActionV1,
  pluginId: PluginId,
): Promise<
  { readonly event: ExportAppliedEvent; readonly createdDirectory: CapturedDirectory; readonly failure?: never }
  | { readonly failure: ActionFailure; readonly event?: never; readonly createdDirectory?: never }
> {
  const staged = await stageAction(session, action);
  if (staged.failure !== undefined) return { failure: staged.failure };
  let visible = false;
  let createdByOperation: CapturedDirectory | undefined;
  let appliedObservationBound = false;
  try {
    await hit(session, "AfterInverseStaged", plan.destination.path, action.relativePath);
    await revalidateCapturedLedger(plan.current);
    const created = await ensureDirectories(plan.destination, [action.relativePath]);
    if (created.length !== 1) throw new ExportFilesystemError(failure("MutationFailed", "directory-create", "Directory creation did not create exactly one bound entry", action.relativePath));
    visible = true;
    createdByOperation = created[0]!;
    await hit(session, "AfterDirectoriesCreated", plan.destination.path, action.relativePath);
    await revalidateOperationCreatedDirectory(plan, createdByOperation);
    const marked = await markApplied(session, staged, observedDirectory(createdByOperation));
    appliedObservationBound = marked === undefined;
    await revalidateOperationCreatedDirectory(plan, createdByOperation);
    if (marked !== undefined) return {
      failure: actionFailure(marked, true, undefined, event("CreateDirectory", pluginId, action.relativePath, staged.digest)),
    };
    return {
      event: event("CreateDirectory", pluginId, action.relativePath, staged.digest),
      createdDirectory: createdByOperation,
    };
  } catch (error) {
    if (!visible) {
      try {
        const current = await capturePath(plan.destination, action.relativePath, 1);
        visible = current.kind === "Present";
      } catch {
        visible = true;
      }
    }
    const primary = toFilesystemError(error).failure;
    if (!visible) return { failure: await discardOrFailure(session, staged, primary) };
    let definitelyApplied = false;
    if (createdByOperation !== undefined) {
      try {
        await revalidateOperationCreatedDirectory(plan, createdByOperation);
        definitelyApplied = true;
      } catch {
        // A substituted directory is never claimed as this operation's applied state.
      }
    }
    return {
      failure: actionFailure(
        primary,
        true,
        undefined,
        definitelyApplied || appliedObservationBound
          ? event("CreateDirectory", pluginId, action.relativePath, staged.digest)
          : undefined,
      ),
    };
  }
}

interface FileWriteInput {
  readonly plan: DestinationExportPlan;
  readonly session: ExportMutationSession;
  readonly action: ExportInverseActionV1;
  readonly target: CapturedPath;
  readonly bytes: Uint8Array;
  readonly mode: number;
  readonly prefix: string;
  readonly pluginId: PluginId | "@ledger";
  readonly eventMutation: "WritePayload" | "WriteLedger";
  readonly commitFailpoint: ExportFailpoint;
  readonly afterCommitFailpoint: ExportFailpoint;
  readonly verifyFailpoint?: ExportFailpoint;
  readonly beforeCommit?: () => Promise<void>;
}

async function applyFileWrite(input: FileWriteInput): Promise<
  { readonly event: ExportAppliedEvent; readonly publishedFile: CapturedRegularFile; readonly failure?: never }
  | { readonly failure: ActionFailure; readonly event?: never }
> {
  const staged = await stageAction(input.session, input.action);
  if (staged.failure !== undefined) return { failure: staged.failure };
  let opened: OpenedTemporary | undefined;
  let temporary: OwnedTemporary | undefined;
  let closed = false;
  let commitStarted = false;
  let committed = false;
  let publishedByOperation: PublishedFileIdentity | undefined;
  let appliedObservationBound = false;
  try {
    await hit(input.session, "AfterInverseStaged", input.plan.destination.path, input.action.relativePath);
    await revalidateCapturedLedger(input.plan.current);
    opened = await openPrivateTemporary(
      input.plan.destination,
      input.target.kind === "Absent" ? input.target.path : input.target.file.path,
      input.prefix,
      (input.session.operationId ?? randomUUID)(),
    );
    temporary = await captureOpenedTemporary(input.plan.destination, opened);
    await hit(input.session, "AfterTemporaryCreated", input.plan.destination.path, input.action.relativePath, temporary.path);
    try {
      temporary = await writeOpenedTemporary(input.plan.destination, opened, temporary, input.bytes, input.mode);
    } catch (error) {
      try {
        temporary = await captureOpenedTemporary(input.plan.destination, opened, temporary);
      } catch {
        // The exact owned identity cannot be re-established; guarded cleanup will stay blocked.
      }
      throw error;
    }
    await hit(input.session, "AfterTemporaryWritten", input.plan.destination.path, input.action.relativePath, temporary.path);
    await closeTemporary(opened);
    closed = true;
    await verifyOwnedTemporary(temporary, input.bytes, input.mode);
    await revalidateCapturedLedger(input.plan.current);
    commitStarted = true;
    publishedByOperation = await commitTemporary(input.plan.destination, temporary, input.target, async (phase) => {
      await hit(
        input.session,
        phase === "TargetPublication" ? input.commitFailpoint : "BeforePublicationFinalize",
        input.plan.destination.path,
        input.action.relativePath,
        temporary?.path,
      );
      await input.beforeCommit?.();
    });
    committed = true;
    temporary = undefined;
    await hit(input.session, input.afterCommitFailpoint, input.plan.destination.path, input.action.relativePath);
    if (input.verifyFailpoint !== undefined) {
      await hit(input.session, input.verifyFailpoint, input.plan.destination.path, input.action.relativePath);
    }
    const published = await verifyPublishedFile(
      input.plan.destination,
      input.action.relativePath,
      input.bytes,
      input.mode,
      publishedByOperation,
    );
    const marked = await markApplied(input.session, staged, observedFile(published));
    appliedObservationBound = marked === undefined;
    const finalPublished = await verifyPublishedFile(
      input.plan.destination,
      input.action.relativePath,
      input.bytes,
      input.mode,
      publishedByOperation,
    );
    if (marked !== undefined) return {
      failure: actionFailure(marked, true, undefined, event(input.eventMutation, input.pluginId, input.action.relativePath, staged.digest)),
    };
    return {
      event: event(input.eventMutation, input.pluginId, input.action.relativePath, staged.digest),
      publishedFile: finalPublished,
    };
  } catch (error) {
    const primary = toFilesystemError(error).failure;
    let cleanup: ExportFailure | undefined;
    if (opened !== undefined && !closed) {
      try {
        await closeTemporary(opened);
      } catch (closeError) {
        cleanup = failure("TemporaryCleanupFailed", "temporary-close", toFilesystemError(closeError).failure.message, opened.path);
      }
    }
    if (!committed && temporary !== undefined) {
      const tempCleanup = await cleanupOwnedTemporary(input.plan.destination, temporary, async () => {
        await hit(
          input.session,
          "BeforeTemporaryCleanup",
          input.plan.destination.path,
          input.action.relativePath,
          temporary?.path,
        );
      });
      cleanup ??= tempCleanup;
    } else if (!committed && opened !== undefined && temporary === undefined) {
      cleanup ??= failure(
        "TemporaryCleanupBlocked",
        "temporary-cleanup",
        "Private temporary is preserved because its exact current-operation identity was not captured",
        opened.path,
      );
    }
    let definitelyApplied = false;
    if (publishedByOperation !== undefined) {
      try {
        await verifyPublishedFile(
          input.plan.destination,
          input.action.relativePath,
          input.bytes,
          input.mode,
          publishedByOperation,
        );
        definitelyApplied = true;
      } catch {
        // A substituted inode is never claimed as this operation's applied state.
      }
    }
    const visibleOrAmbiguous = definitelyApplied || committed || commitStarted;
    if (!visibleOrAmbiguous) {
      const discarded = await discardOrFailure(input.session, staged, primary, cleanup);
      return { failure: discarded };
    }
    return {
      failure: actionFailure(
        primary,
        true,
        cleanup,
        definitelyApplied || appliedObservationBound
          ? event(input.eventMutation, input.pluginId, input.action.relativePath, staged.digest)
          : undefined,
      ),
    };
  }
}

async function verifyDestinationClaims(
  plan: DestinationExportPlan,
  operationPublishedFiles: ReadonlyMap<string, CapturedRegularFile>,
  operationCreatedDirectories: ReadonlyMap<string, CapturedDirectory>,
): Promise<void> {
  const claimedDirectories = new Set<string>(plan.nextLedger.body.scopes.flatMap((scope) => scope.directories));
  for (const [relativePath, directory] of operationCreatedDirectories) {
    if (!claimedDirectories.has(relativePath)) throw new ExportFilesystemError(failure(
      "VerificationFailed",
      "destination-final-verify",
      "Operation-created directory is absent from the settled ledger plan",
      relativePath,
    ));
    await revalidateOperationCreatedDirectory(plan, directory);
  }
  for (const scope of plan.nextLedger.body.scopes) {
    for (const claim of scope.files) {
      const operationPublished = operationPublishedFiles.get(claim.relativePath);
      if (operationPublished !== undefined) {
        await revalidateCapturedFile(operationPublished);
        if (
          visibleFileMode(operationPublished) !== claim.mode
          || operationPublished.contentDigest !== claim.contentDigest
        ) throw new ExportFilesystemError(failure(
          "VerificationFailed",
          "destination-final-verify",
          "Operation-published file differs from the settled ledger plan",
          claim.relativePath,
        ));
        continue;
      }
      const captured = await capturePath(plan.destination, claim.relativePath);
      if (
        captured.kind !== "Present"
        || visibleFileMode(captured.file) !== claim.mode
        || captured.file.contentDigest !== claim.contentDigest
      ) throw new ExportFilesystemError(failure(
        "VerificationFailed",
        "destination-final-verify",
        "Managed claim differs from the settled ledger plan",
        claim.relativePath,
      ));
    }
  }
}

async function revalidateOperationCreatedDirectory(
  plan: DestinationExportPlan,
  expected: CapturedDirectory,
): Promise<void> {
  const current = await captureExistingDirectory(plan.destination, expected.relativePath);
  if (
    current.path !== expected.path
    || current.dev !== expected.dev
    || current.ino !== expected.ino
    || current.birthtimeNs !== expected.birthtimeNs
    || visibleDirectoryMode(current) !== visibleDirectoryMode(expected)
  ) throw new ExportFilesystemError(failure(
    "PathChanged",
    "directory-created-identity",
    "Operation-created directory identity changed before settlement",
    expected.path,
  ));
}

async function applyFileRetirement(
  plan: DestinationExportPlan,
  session: ExportMutationSession,
  action: ExportInverseActionV1,
  pluginId: PluginId,
  target: Extract<CapturedPath, { kind: "Present" }>,
): Promise<{ readonly event: ExportAppliedEvent; readonly failure?: never } | { readonly failure: ActionFailure; readonly event?: never }> {
  const staged = await stageAction(session, action);
  if (staged.failure !== undefined) return { failure: staged.failure };
  let mutationStarted = false;
  try {
    await hit(session, "AfterInverseStaged", plan.destination.path, action.relativePath);
    await revalidateCapturedLedger(plan.current);
    mutationStarted = true;
    await unlinkCapturedFile(plan.destination, target.file, async () => {
      await hit(session, "BeforeRetirement", plan.destination.path, action.relativePath);
    });
    await hit(session, "AfterRetirement", plan.destination.path, action.relativePath);
    await verifyPathAbsent(plan.destination, action.relativePath, target.file.parentChain);
    const marked = await markApplied(session, staged, Object.freeze({ kind: "Absent" }));
    if (marked !== undefined) return {
      failure: actionFailure(marked, true, undefined, event("RetirePayload", pluginId, action.relativePath, staged.digest)),
    };
    return { event: event("RetirePayload", pluginId, action.relativePath, staged.digest) };
  } catch (error) {
    const primary = toFilesystemError(error).failure;
    if (!mutationStarted) return { failure: await discardOrFailure(session, staged, primary) };
    let definitelyApplied = false;
    try {
      await verifyPathAbsent(plan.destination, action.relativePath, target.file.parentChain);
      definitelyApplied = true;
    } catch {
      // Applying recovery must classify the staged action.
    }
    return {
      failure: actionFailure(
        primary,
        true,
        undefined,
        definitelyApplied ? event("RetirePayload", pluginId, action.relativePath, staged.digest) : undefined,
      ),
    };
  }
}

async function applyDirectoryRetirement(
  plan: DestinationExportPlan,
  session: ExportMutationSession,
  action: ExportInverseActionV1,
  pluginId: PluginId,
  directory: Awaited<ReturnType<typeof captureEmptyDirectory>> & object,
): Promise<{ readonly event: ExportAppliedEvent; readonly failure?: never } | { readonly failure: ActionFailure; readonly event?: never }> {
  const staged = await stageAction(session, action);
  if (staged.failure !== undefined) return { failure: staged.failure };
  let mutationStarted = false;
  try {
    await revalidateCapturedLedger(plan.current);
    mutationStarted = true;
    await removeCapturedEmptyDirectory(plan.destination, directory, async () => {
      await hit(session, "BeforeDirectoryRetirement", plan.destination.path, action.relativePath);
    });
    await verifyPathAbsent(plan.destination, action.relativePath, directory.parentChain);
    const marked = await markApplied(session, staged, Object.freeze({ kind: "Absent" }));
    if (marked !== undefined) return {
      failure: actionFailure(marked, true, undefined, event("RetireDirectory", pluginId, action.relativePath, staged.digest)),
    };
    return { event: event("RetireDirectory", pluginId, action.relativePath, staged.digest) };
  } catch (error) {
    const primary = toFilesystemError(error).failure;
    if (!mutationStarted) return { failure: await discardOrFailure(session, staged, primary) };
    let definitelyApplied = false;
    try {
      await verifyPathAbsent(plan.destination, action.relativePath, directory.parentChain);
      definitelyApplied = true;
    } catch {
      // Applying recovery must classify the staged action.
    }
    return {
      failure: actionFailure(
        primary,
        true,
        undefined,
        definitelyApplied ? event("RetireDirectory", pluginId, action.relativePath, staged.digest) : undefined,
      ),
    };
  }
}

interface StagedAction {
  readonly digest: ReturnType<typeof exportInverseActionDigest>;
  readonly actionHandle: string;
}

async function stageAction(
  session: ExportMutationSession,
  action: ExportInverseActionV1,
): Promise<
  | (Readonly<StagedAction> & Readonly<{ failure?: never }>)
  | Readonly<{ failure: ActionFailure; digest?: never; actionHandle?: never }>
> {
  const digest = exportInverseActionDigest(action);
  const sequence = session.admittedActionSequence;
  const admitted = sequence.entries[sequence.nextIndex];
  if (admitted === undefined || admitted.actionDigest !== digest) return {
    failure: actionFailure(failure(
      "UndoAdmissionFailed",
      "undo-stage",
      "Planned inverse action differs from the next position admitted by the controller",
    ), false),
  };
  let result;
  try {
    result = await session.undoSession.stage({ actionHandle: admitted.actionHandle });
  } catch (error) {
    return { failure: actionFailure(failure(
      "UndoStageFailed",
      "undo-stage",
      `Undo stage outcome is unknown: ${errorMessage(error)}`,
    ), true) };
  }
  if (result.kind === "Unsettled") {
    session.capsule.generation = result.generation;
    session.capsule.synchronization = result.synchronization;
    return { failure: actionFailure(exportUndoFailure("UndoStageFailed", "undo-stage", result.failure), true) };
  }
  if (result.kind === "Rejected") {
    return { failure: actionFailure(exportUndoFailure("UndoStageFailed", "undo-stage", result.failure), false) };
  }
  session.capsule.generation = result.generation;
  sequence.nextIndex += 1;
  return { digest, actionHandle: admitted.actionHandle };
}

async function markApplied(
  session: ExportMutationSession,
  staged: StagedAction,
  observedPost: ExportObservedEntryStateV1,
): Promise<ExportFailure | undefined> {
  const observation = createExportAppliedObservation(staged.digest, observedPost);
  try {
    const result = await session.undoSession.markApplied({
      actionHandle: staged.actionHandle,
      observedPost: observation,
    });
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

async function discardOrFailure(
  session: ExportMutationSession,
  staged: StagedAction,
  primary: ExportFailure,
  cleanup?: ExportFailure,
): Promise<ActionFailure> {
  try {
    const discarded = await session.undoSession.discardStaged({
      actionHandle: staged.actionHandle,
    });
    if (discarded.kind === "Accepted") {
      session.capsule.generation = discarded.generation;
      return actionFailure(primary, false, cleanup);
    }
    if (discarded.kind === "Unsettled") {
      session.capsule.generation = discarded.generation;
      session.capsule.synchronization = discarded.synchronization;
    }
    const discardFailure = exportUndoFailure("UndoStageFailed", "undo-discard", discarded.failure);
    return actionFailure(primary, true, cleanup ?? discardFailure);
  } catch (error) {
    const discardFailure = failure(
      "UndoStageFailed",
      "undo-discard",
      `Undo discard outcome is unknown: ${errorMessage(error)}`,
    );
    return actionFailure(primary, true, cleanup ?? discardFailure);
  }
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

async function hit(
  session: ExportMutationSession,
  point: ExportFailpoint,
  destination: string,
  relativePath?: string,
  temporaryPath?: string,
): Promise<void> {
  if (session.failpoints === undefined) return;
  try {
    await session.failpoints.hit(point, {
      destination,
      ...(relativePath === undefined ? {} : { relativePath }),
      ...(temporaryPath === undefined ? {} : { temporaryPath }),
    });
  } catch (error) {
    throw new ExportFilesystemError(failure(
      "FailpointFailed",
      point,
      `Injected export failpoint failed: ${error instanceof Error ? error.message : String(error)}`,
      relativePath,
    ));
  }
}

function event(
  mutation: ExportAppliedEvent["mutation"],
  pluginId: PluginId | "@ledger",
  relativePath: string,
  actionDigest: ReturnType<typeof exportInverseActionDigest>,
): ExportAppliedEvent {
  return Object.freeze({ mutation, pluginId, relativePath, actionDigest });
}

function actionFailure(
  primary: ExportFailure,
  visibleOrAmbiguous: boolean,
  cleanup?: ExportFailure,
  appliedEvent?: ExportAppliedEvent,
): ActionFailure {
  return Object.freeze({
    failures: cleanup === undefined
      ? Object.freeze({ kind: "PrimaryOnly", primary })
      : Object.freeze({ kind: "PrimaryAndCleanup", primary, cleanup }),
    visibleOrAmbiguous,
    ...(appliedEvent === undefined ? {} : { appliedEvent }),
  });
}

function failedResult(applied: readonly ExportAppliedEvent[], outcome: ActionFailure): DestinationTransactionResult {
  const exactApplied = outcome.appliedEvent === undefined ? [...applied] : [...applied, outcome.appliedEvent];
  return outcome.visibleOrAmbiguous || exactApplied.length > 0
    ? Object.freeze({ kind: "Unsettled", applied: Object.freeze(exactApplied), failures: outcome.failures })
    : Object.freeze({ kind: "Rejected", failures: outcome.failures });
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
