import { Effect } from "effect";
import type { ReleaseRelativePath } from "#agent-plugin-lifecycle-service/model/dto/current-main-primitives";
import { decodeGitLocator } from "#agent-plugin-lifecycle-service/model/policy/current-main-locator";
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
} from "#agent-plugin-lifecycle-service/model/policy/current-main-selection";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import type { ProviderSyncRequest, ProviderSyncResult } from "../model/dto/provider-lifecycle";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  mutationClassification,
  rejectedTargets,
  sourceChangedTargets,
} from "../model/policy/operation-result";
import {
  constructSelectedContent,
  providerIssue,
  providerSelectionResolution,
  sameSelectedContent,
  selectedContentFromReleaseDerivationFailure,
  selectedContentObservation,
} from "../model/policy/selected-content";
import {
  CHANNEL_NATIVE_MARKETPLACE_SPARSE_PATHS,
  CHANNEL_SELECTED_CONTENT_PATHS,
  classifyClosingSelectedContentChannel,
  classifySelectedContentChannelAnchor,
  classifySelectedContentChannelPayloads,
  classifySelectedContentChannelReleaseInput,
  classifySelectedContentChannelSelection,
  classifySelectedContentChannelTree,
  classifySelectedContentManifestBlob,
  MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
  MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES,
  MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES,
  MAX_SELECTED_CONTENT_RELEASE_SET_PAYLOAD_BYTES,
  MAX_SELECTED_CONTENT_TREE_BYTES,
  MAX_SELECTED_CONTENT_TREE_ENTRIES,
  NATIVE_MARKETPLACE_MANIFESTS,
  planSelectedContentChannelPayloadRead,
  selectSelectedContentChannelManifestEntry,
  validateSelectedNativeMarketplaces,
} from "../model/policy/source-interface";
import { module } from "../module";
import {
  allTargetsConverged,
  blockedTargetResults,
  convergedMutationTargetResult,
  hasBlockingAssessment,
  inspectProviderTargets,
  reconcileProviderTargets,
} from "./reconcile.router";

/**
 * Authors canonical Provider convergence from a lazily repeated governed
 * channel selection.
 */
export const sync = module.sync.effect(function* ({ context, input }) {
  const canonicalRequest = Object.freeze({
    ...input,
    targets: canonicalProviderTargets(input.targets),
  });
  const locator = decodeGitLocator(canonicalRequest.locator);

  /**
   * Performs one complete current-main plus selected-content observation.
   *
   * The Effect is built afresh for each call. The converged path invokes it
   * once; a path that may mutate invokes it once more before native commands.
   */
  const selectChannel = () =>
    !locator.ok
      ? Effect.succeed({
          kind: "Rejected" as const,
          issues: Object.freeze([
            providerIssue("SelectionRejected", `WRONG_REPOSITORY: ${locator.reason}`),
          ]),
        })
      : Effect.gen(function* () {
          const currentMain = yield* Effect.gen(function* () {
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
            const recordRef = classifySelectedGitRef(
              locator.value,
              recordSelection,
              recordRefAttempt
            );
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
            const record = classifyCurrentMainRecord(
              locator.value,
              opening.value,
              recordBlob.value
            );
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

            const releaseInputSelection = currentMainReleaseInputSelection(
              opening.value,
              record.value
            );
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
          if (currentMain.kind !== "CURRENT_ELIGIBLE") {
            return {
              kind: "Rejected" as const,
              issues: Object.freeze([
                providerIssue("SelectionRejected", `${currentMain.kind}: ${currentMain.reason}`),
              ]),
            };
          }

          const channel = classifySelectedContentChannelSelection(
            canonicalRequest.locator,
            currentMain.selection
          );
          if (!channel.ok) return providerSelectionResolution(channel.result);
          const channelOpeningAttempt = yield* Effect.result(
            context.contentWorkspace.inspectGitRef({
              locator: canonicalRequest.locator.workspacePath,
              remoteSelection: { kind: "All" },
              refName: channel.value.sourceRef,
            })
          );
          const channelOpening = classifySelectedContentChannelAnchor(
            channel.value,
            channelOpeningAttempt
          );
          if (!channelOpening.ok) return providerSelectionResolution(channelOpening.result);

          const treeAttempt = yield* Effect.result(
            context.contentWorkspace.readGitTree({
              root: channelOpening.value.observation.root,
              tree: channelOpening.value.observation.tree,
              objectFormat: channelOpening.value.observation.objectFormat,
              paths: CHANNEL_SELECTED_CONTENT_PATHS,
              maxEntries: MAX_SELECTED_CONTENT_TREE_ENTRIES,
              maxBytes: MAX_SELECTED_CONTENT_TREE_BYTES,
            })
          );
          const tree = classifySelectedContentChannelTree(channelOpening.value, treeAttempt);
          if (!tree.ok) return providerSelectionResolution(tree.result);

          const channelReleaseInputAttempt = yield* Effect.result(
            context.contentWorkspace.readGitBlob({
              root: tree.value.observation.root,
              blob: tree.value.releaseInputEntry.objectId,
              objectFormat: tree.value.observation.objectFormat,
              maxBytes: MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES,
            })
          );
          const channelReleaseInput = classifySelectedContentChannelReleaseInput(
            channel.value,
            tree.value,
            channelReleaseInputAttempt
          );
          if (!channelReleaseInput.ok) {
            return providerSelectionResolution(channelReleaseInput.result);
          }

          const manifestBytes = new Map<ReleaseRelativePath, Uint8Array>();
          for (const path of NATIVE_MARKETPLACE_MANIFESTS) {
            const selectedManifest = selectSelectedContentChannelManifestEntry(
              channelReleaseInput.value,
              path
            );
            if (!selectedManifest.ok) {
              return providerSelectionResolution(selectedManifest.result);
            }
            const entry = selectedManifest.value;
            const manifestAttempt = yield* Effect.result(
              context.contentWorkspace.readGitBlob({
                root: tree.value.observation.root,
                blob: entry.objectId,
                objectFormat: tree.value.observation.objectFormat,
                maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
              })
            );
            const manifest = classifySelectedContentManifestBlob(path, manifestAttempt);
            if (!manifest.ok) return providerSelectionResolution(manifest.result);
            manifestBytes.set(path, manifest.value);
          }
          const marketplaceIssue = validateSelectedNativeMarketplaces(
            channelReleaseInput.value.releaseInput,
            manifestBytes
          );
          if (marketplaceIssue !== undefined) {
            return providerSelectionResolution(marketplaceIssue);
          }

          const payloadPlan = planSelectedContentChannelPayloadRead(channelReleaseInput.value);
          if (!payloadPlan.ok) return providerSelectionResolution(payloadPlan.result);
          const payloadAttempt = yield* Effect.result(
            context.contentWorkspace.readGitBlobs({
              root: payloadPlan.value.observation.root,
              blobs: payloadPlan.value.blobs,
              objectFormat: payloadPlan.value.observation.objectFormat,
              maxBlobs: MAX_SELECTED_CONTENT_TREE_ENTRIES,
              maxBlobBytes: MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES,
              maxTotalBytes: MAX_SELECTED_CONTENT_RELEASE_SET_PAYLOAD_BYTES,
            })
          );
          const payloads = classifySelectedContentChannelPayloads(
            payloadPlan.value,
            payloadAttempt
          );
          if (!payloads.ok) return providerSelectionResolution(payloads.result);

          const derivation = deriveReleaseSelection(
            {
              repositoryIdentity: channel.value.sourceRepositoryIdentity,
              sourceCommit: channel.value.contentCommit,
              sourceTree: channel.value.contentTree,
              releaseInput: payloads.value.releaseInput,
              payloads: payloads.value.payloads,
            },
            { kind: "complete-set" }
          );
          if (!derivation.ok) {
            return providerSelectionResolution(
              selectedContentFromReleaseDerivationFailure(derivation.failure)
            );
          }
          const constructed = providerSelectionResolution(
            constructSelectedContent({
              derivation: derivation.value,
              selectionKind: "complete-set",
              marketplace: Object.freeze({
                identity: channel.value.contentAuthority,
                source: Object.freeze({
                  kind: "git",
                  repositoryUrl: channel.value.sourceRepositoryUrl,
                  revision: channel.value.contentCommit,
                  sparsePaths: [...CHANNEL_NATIVE_MARKETPLACE_SPARSE_PATHS],
                }),
              }),
            })
          );
          if (constructed.kind === "Rejected") return constructed;

          const channelClosingAttempt = yield* Effect.result(
            context.contentWorkspace.inspectGitRef({
              locator: canonicalRequest.locator.workspacePath,
              remoteSelection: { kind: "All" },
              refName: channel.value.sourceRef,
            })
          );
          const channelClosing = classifyClosingSelectedContentChannel(
            channelOpening.value,
            channelClosingAttempt
          );
          return channelClosing.ok
            ? constructed
            : providerSelectionResolution(channelClosing.result);
        });

  const selected = yield* selectChannel();
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
      selection: selectedContentObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }
  if (allTargetsConverged(initial)) {
    const targets = Object.freeze(initial.map(convergedMutationTargetResult));
    return {
      operation: "sync",
      classification: "Converged",
      selection: selectedContentObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }

  const revalidated = yield* selectChannel();
  if (
    revalidated.kind === "Rejected" ||
    !sameSelectedContent(selected.content, revalidated.content)
  ) {
    const targets = sourceChangedTargets(canonicalRequest.targets);
    return {
      operation: "sync",
      classification: "Blocked",
      selection: selectedContentObservation(selected.content),
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
      selection: selectedContentObservation(revalidated.content),
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
    selection: selectedContentObservation(revalidated.content),
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
