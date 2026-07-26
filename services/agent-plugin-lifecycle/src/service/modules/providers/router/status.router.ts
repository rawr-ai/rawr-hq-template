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
import type { ProviderStatusResult } from "../model/dto/provider-lifecycle";
import { module } from "../module";
import { inspectProviderTargets, statusTargetResult } from "./reconcile.router";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  rejectedStatusTargets,
  selectionObservation,
} from "./result.router";
import { resolveChannelSelection } from "./selection.router";

export const status = module.status.effect(function* ({ context, input }) {
  const locator = decodeGitLocator(input.locator);
  const currentMain = !locator.ok
    ? Object.freeze({
        kind: "WRONG_REPOSITORY" as const,
        reason: locator.reason,
      })
    : yield* Effect.gen(function* () {
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
      });

  const canonicalRequest = Object.freeze({
    ...input,
    targets: canonicalProviderTargets(input.targets),
  });
  const selected = yield* resolveChannelSelection(
    canonicalRequest,
    currentMain,
    context.selectedContent
  );
  if (selected.kind === "Rejected") {
    return {
      operation: "status",
      classification: "Blocked",
      selection: null,
      targets: rejectedStatusTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    } satisfies ProviderStatusResult;
  }
  const assessments = yield* inspectProviderTargets(
    selected.content,
    canonicalRequest.targets,
    context.nativeProviders,
    { retireOmitted: true },
    false
  );
  const targets = Object.freeze(assessments.map(statusTargetResult));
  const classification = targets.some((target) => target.classification === "Blocked")
    ? "Blocked"
    : targets.some((target) => target.classification === "Failed")
      ? "Failed"
      : targets.some((target) => target.classification === "Drifted")
        ? "Drifted"
        : "Converged";
  return {
    operation: "status",
    classification,
    selection: selectionObservation(selected.content),
    targets,
    issues: collectTargetIssues(targets),
  } satisfies ProviderStatusResult;
});
