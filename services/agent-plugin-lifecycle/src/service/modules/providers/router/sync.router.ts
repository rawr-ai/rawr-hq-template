import { Effect } from "effect";
import { decodeGitLocator } from "../../../model/policy/current-main-locator";
import {
  CURRENT_MAIN_SELECTION_REF,
  classifyCurrentMainAncestry,
  classifyCurrentMainInspection,
  classifyCurrentMainRecord,
  classifyCurrentMainReleaseInput,
  classifySelectedGitBlob,
  classifySelectedGitRef,
  currentMainRecordSelection,
  currentMainReleaseInputSelection,
  finishCurrentMainSelection,
  MAX_CURRENT_MAIN_GIT_BLOB_BYTES,
} from "../../../model/policy/current-main-selection";
import type { ProviderSyncRequest, ProviderSyncResult } from "../model/dto/provider-lifecycle";
import { sameSelectedContent } from "../model/policy/selected-content";
import { module } from "../module";
import {
  allTargetsConverged,
  blockedTargetResults,
  convergedMutationTargetResult,
  hasBlockingAssessment,
  inspectProviderTargets,
  reconcileProviderTargets,
} from "./reconcile.router";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  mutationClassification,
  rejectedTargets,
  selectionObservation,
  sourceChangedTargets,
} from "./result.router";
import { resolveChannelSelection } from "./selection.router";

export const sync = module.sync.effect(function* ({ context, input }) {
  const locator = decodeGitLocator(input.locator);
  const currentMainSelection = locator.ok
    ? Effect.gen(function* () {
        const openingAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: CURRENT_MAIN_SELECTION_REF,
          })
        );
        const opening = classifyCurrentMainInspection(locator.value, openingAttempt);
        if (!opening.ok) return opening.result;

        const recordSelection = currentMainRecordSelection(opening.value);
        const recordRefAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: recordSelection.ref,
          })
        );
        const recordRef = classifySelectedGitRef(locator.value, recordSelection, recordRefAttempt);
        if (!recordRef.ok) return recordRef.result;
        const recordBlobAttempt = yield* Effect.result(
          context.contentWorkspace.readGitBlobAtPath({
            root: recordRef.value.root,
            refName: recordSelection.ref,
            commit: recordSelection.commit,
            tree: recordSelection.tree,
            path: recordSelection.path,
            maxBytes: MAX_CURRENT_MAIN_GIT_BLOB_BYTES,
          })
        );
        const recordBlob = classifySelectedGitBlob(recordSelection, recordBlobAttempt);
        if (!recordBlob.ok) return recordBlob.result;
        const record = classifyCurrentMainRecord(locator.value, opening.value, recordBlob.value);
        if (!record.ok) return record.result;

        const ancestryAttempt = yield* Effect.result(
          context.contentWorkspace.isLocalGitAncestor({
            root: locator.value.workspacePath,
            ancestorCommit: record.value.contentCommit,
            descendantCommit: opening.value.headCommit,
          })
        );
        const ancestryFailure = classifyCurrentMainAncestry(ancestryAttempt);
        if (ancestryFailure !== undefined) return ancestryFailure;

        const releaseInputSelection = currentMainReleaseInputSelection(opening.value, record.value);
        const releaseInputRefAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: releaseInputSelection.ref,
          })
        );
        const releaseInputRef = classifySelectedGitRef(
          locator.value,
          releaseInputSelection,
          releaseInputRefAttempt
        );
        if (!releaseInputRef.ok) return releaseInputRef.result;
        const releaseInputBlobAttempt = yield* Effect.result(
          context.contentWorkspace.readGitBlobAtPath({
            root: releaseInputRef.value.root,
            refName: releaseInputSelection.ref,
            commit: releaseInputSelection.commit,
            tree: releaseInputSelection.tree,
            path: releaseInputSelection.path,
            maxBytes: MAX_CURRENT_MAIN_GIT_BLOB_BYTES,
          })
        );
        const releaseInputBlob = classifySelectedGitBlob(
          releaseInputSelection,
          releaseInputBlobAttempt
        );
        if (!releaseInputBlob.ok) return releaseInputBlob.result;
        const releaseInputFailure = classifyCurrentMainReleaseInput(
          record.value,
          releaseInputBlob.value
        );
        if (releaseInputFailure !== undefined) return releaseInputFailure;

        const closingAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: CURRENT_MAIN_SELECTION_REF,
          })
        );
        const closing = classifyCurrentMainInspection(locator.value, closingAttempt);
        if (!closing.ok) return closing.result;
        return finishCurrentMainSelection(opening.value, closing.value, record.value.record);
      })
    : Effect.succeed(
        Object.freeze({
          kind: "WRONG_REPOSITORY" as const,
          reason: locator.reason,
        })
      );

  const canonicalRequest = Object.freeze({
    ...input,
    targets: canonicalProviderTargets(input.targets),
  });
  const selected = yield* resolveChannelSelection(
    canonicalRequest,
    yield* currentMainSelection,
    context.selectedContent
  );
  if (selected.kind === "Rejected") {
    return blockedResult(canonicalRequest, selected.issues);
  }
  const initial = yield* inspectProviderTargets(
    selected.content,
    canonicalRequest.targets,
    context.nativeProviders,
    { retireOmitted: true },
    true
  );
  if (hasBlockingAssessment(initial)) {
    const targets = blockedTargetResults(initial);
    return {
      operation: "sync",
      classification: mutationClassification(targets),
      selection: selectionObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }
  if (allTargetsConverged(initial)) {
    const targets = Object.freeze(initial.map(convergedMutationTargetResult));
    return {
      operation: "sync",
      classification: "Converged",
      selection: selectionObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }

  const revalidated = yield* resolveChannelSelection(
    canonicalRequest,
    yield* currentMainSelection,
    context.selectedContent
  );
  if (
    revalidated.kind === "Rejected" ||
    !sameSelectedContent(selected.content, revalidated.content)
  ) {
    const targets = sourceChangedTargets(canonicalRequest.targets);
    return {
      operation: "sync",
      classification: "Blocked",
      selection: selectionObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }

  const finalPreflight = yield* inspectProviderTargets(
    revalidated.content,
    canonicalRequest.targets,
    context.nativeProviders,
    { retireOmitted: true },
    true
  );
  if (hasBlockingAssessment(finalPreflight)) {
    const targets = blockedTargetResults(finalPreflight);
    return {
      operation: "sync",
      classification: mutationClassification(targets),
      selection: selectionObservation(revalidated.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }
  const targets = allTargetsConverged(finalPreflight)
    ? Object.freeze(finalPreflight.map(convergedMutationTargetResult))
    : yield* reconcileProviderTargets(revalidated.content, finalPreflight, {
        retireOmitted: true,
      });
  return {
    operation: "sync",
    classification: mutationClassification(targets),
    selection: selectionObservation(revalidated.content),
    targets,
    issues: collectTargetIssues(targets),
  } satisfies ProviderSyncResult;
});

function blockedResult(
  request: ProviderSyncRequest,
  issues: ProviderSyncResult["issues"]
): ProviderSyncResult {
  return {
    operation: "sync",
    classification: "Blocked",
    selection: null,
    targets: rejectedTargets(request.targets, issues),
    issues,
  };
}
