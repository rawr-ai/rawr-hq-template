import { Effect } from "effect";

import {
  classifyCleanContentWorkspaceAnchor,
  classifyCleanContentWorkspaceTree,
  classifyCleanPayloads,
  classifyCleanReleaseInput,
  classifyCleanWorkspaceEvidence,
  classifyClosingCleanWorkspaceEvidence,
  finishCleanContentWorkspaceInspection,
  MAX_CLEAN_CONTENT_INDEX_BYTES,
  MAX_CLEAN_CONTENT_TREE_BYTES,
  MAX_CLEAN_CONTENT_TREE_ENTRIES,
  MAX_CLEAN_CONTENT_WORKTREE_BYTES,
  MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
  MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
  MAX_CLEAN_RELEASE_INPUT_BYTES,
  MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
  validateCleanContentWorkspacePolicy,
} from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import type { ProviderTestResult } from "../model/dto/provider-lifecycle";
import type { SelectedContent } from "../model/dto/selected-content";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  mutationClassification,
  rejectedTargets,
  sourceChangedTargets,
} from "../model/policy/operation-result";
import {
  constructSelectedContent,
  providerSelectionResolution,
  sameSelectedContent,
  selectedContentFromReleaseDerivationFailure,
  selectedContentFromSourceIssues,
  selectedContentObservation,
  selectedContentRejected,
} from "../model/policy/selected-content";
import {
  classifyLocalSelectedContentManifest,
  classifySelectedContentInterfaceTree,
  classifySelectedContentManifestBlob,
  MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
  NATIVE_MARKETPLACE_INTERFACE_PATHS,
  SELECTED_CONTENT_PLUGIN_ROOT,
  SELECTED_CONTENT_RELEASE_INPUT_PATH,
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
 * Authors disposable Provider convergence from exact local Git content.
 *
 * @remarks
 * Source selection is deliberately invocation-local. The handler sequences
 * ready resources, passes typed facts into pure policy, and completes two
 * independent selections before admitting any native mutation.
 */
export const test = module.test.effect(function* ({ context, input: request }) {
  const canonicalRequest = Object.freeze({
    ...request,
    targets: canonicalProviderTargets(request.targets),
  });
  const policy = canonicalRequest.contentWorkspace;

  /**
   * Executes one complete clean-content observation lazily for each call.
   *
   * This procedure-owned group establishes the exact Git snapshot used by
   * selection without creating a reusable reader or a second resource face.
   */
  const inspectCleanWorkspace = () =>
    Effect.gen(function* () {
      const policyIssue = validateCleanContentWorkspacePolicy(policy);
      if (policyIssue !== undefined) {
        return {
          kind: "Ineligible" as const,
          issues: [policyIssue] as const,
        };
      }

      const anchorAttempt = yield* Effect.result(
        context.contentWorkspace.inspectGitWorkspace({
          locator: policy.locator,
          remoteSelection: { kind: "Named", remoteName: policy.remoteName },
          refName: policy.refName,
        })
      );
      const anchor = classifyCleanContentWorkspaceAnchor(policy, anchorAttempt);
      if (!anchor.ok) return anchor.result;

      const treeAttempt = yield* Effect.result(
        context.contentWorkspace.readGitTree({
          root: anchor.value.anchor.root,
          tree: anchor.value.anchor.tree,
          objectFormat: anchor.value.anchor.objectFormat,
          paths: [policy.releaseInputPath, policy.pluginRoot],
          maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES,
          maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES,
        })
      );
      const tree = classifyCleanContentWorkspaceTree(policy, anchor.value, treeAttempt);
      if (!tree.ok) return tree.result;

      const releaseInputAttempt = yield* Effect.result(
        context.contentWorkspace.readGitBlob({
          root: tree.value.anchor.root,
          blob: tree.value.releaseInputEntry.objectId,
          objectFormat: tree.value.anchor.objectFormat,
          maxBytes: MAX_CLEAN_RELEASE_INPUT_BYTES,
        })
      );
      const releaseInput = classifyCleanReleaseInput(policy, tree.value, releaseInputAttempt);
      if (!releaseInput.ok) return releaseInput.result;

      const payloadAttempt = yield* Effect.result(
        context.contentWorkspace.readGitBlobs({
          root: releaseInput.value.anchor.root,
          blobs: releaseInput.value.blobEntries.map((entry) => entry.objectId),
          objectFormat: releaseInput.value.anchor.objectFormat,
          maxBlobs: MAX_CLEAN_CONTENT_TREE_ENTRIES,
          maxBlobBytes: MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
          maxTotalBytes: MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
        })
      );
      const payloads = classifyCleanPayloads(releaseInput.value, payloadAttempt);
      if (!payloads.ok) return payloads.result;

      const evidenceRequest = {
        root: payloads.value.anchor.root,
        remoteSelection: { kind: "Named" as const, remoteName: policy.remoteName },
        refName: policy.refName,
        admittedPaths: payloads.value.admittedPaths,
        consumedRoots: payloads.value.consumedRoots,
        objectFormat: payloads.value.anchor.objectFormat,
        maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
        maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
        maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
      };
      const openingEvidenceAttempt = yield* Effect.result(
        context.contentWorkspace.captureGitWorkspaceEvidence(evidenceRequest)
      );
      const openingEvidence = classifyCleanWorkspaceEvidence(
        policy,
        payloads.value,
        openingEvidenceAttempt
      );
      if (!openingEvidence.ok) return openingEvidence.result;

      const closingEvidenceAttempt = yield* Effect.result(
        context.contentWorkspace.captureGitWorkspaceEvidence(evidenceRequest)
      );
      const closingEvidence = classifyClosingCleanWorkspaceEvidence(
        payloads.value,
        closingEvidenceAttempt
      );
      if (!closingEvidence.ok) return closingEvidence.result;

      return finishCleanContentWorkspaceInspection(
        policy,
        payloads.value,
        openingEvidence.value,
        closingEvidence.value
      );
    });

  /**
   * Resolves one complete disposable-test selection from current resource facts.
   *
   * Each call performs fresh clean inspection, interface reads, local manifest
   * checks, clean revalidation, and final manifest rereads. Nothing is memoized.
   */
  const selectWorkspace = () =>
    Effect.gen(function* () {
      if (
        policy.releaseInputPath !== SELECTED_CONTENT_RELEASE_INPUT_PATH ||
        policy.pluginRoot !== SELECTED_CONTENT_PLUGIN_ROOT
      ) {
        return providerSelectionResolution(
          selectedContentRejected(
            "SourceIneligible",
            `Local provider content must use ${SELECTED_CONTENT_RELEASE_INPUT_PATH} and ${SELECTED_CONTENT_PLUGIN_ROOT}.`
          )
        );
      }

      const inspected = yield* inspectCleanWorkspace();
      if (inspected.kind === "Ineligible") {
        return providerSelectionResolution(selectedContentFromSourceIssues(inspected.issues));
      }

      const objectFormat = inspected.snapshot.sourceCommit.length === 40 ? "sha1" : "sha256";
      const interfaceTreeAttempt = yield* Effect.result(
        context.contentWorkspace.readGitTree({
          root: policy.locator,
          tree: inspected.snapshot.sourceTree,
          objectFormat,
          paths: NATIVE_MARKETPLACE_INTERFACE_PATHS,
          maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES,
          maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES,
        })
      );
      const interfaceTree = classifySelectedContentInterfaceTree(interfaceTreeAttempt);
      if (!interfaceTree.ok) return providerSelectionResolution(interfaceTree.result);

      const manifestBytes = new Map<
        (typeof interfaceTree.value.manifestEntries)[number]["path"],
        Uint8Array
      >();
      for (const entry of interfaceTree.value.manifestEntries) {
        const manifestAttempt = yield* Effect.result(
          context.contentWorkspace.readGitBlob({
            root: policy.locator,
            blob: entry.objectId,
            objectFormat,
            maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
          })
        );
        const manifest = classifySelectedContentManifestBlob(entry.path, manifestAttempt);
        if (!manifest.ok) return providerSelectionResolution(manifest.result);
        manifestBytes.set(entry.path, manifest.value);
      }

      const marketplaceIssue = validateSelectedNativeMarketplaces(
        inspected.snapshot.releaseInput,
        manifestBytes
      );
      if (marketplaceIssue !== undefined) {
        return providerSelectionResolution(marketplaceIssue);
      }

      for (const [path, expected] of manifestBytes) {
        const localAttempt = yield* Effect.result(
          context.contentWorkspace.readFile({
            root: policy.locator,
            path,
            maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
          })
        );
        const local = classifyLocalSelectedContentManifest(path, expected, localAttempt);
        if (!local.ok) return providerSelectionResolution(local.result);
      }

      const derivation = deriveReleaseSelection(
        inspected.snapshot,
        canonicalRequest.mode.kind === "targeted"
          ? {
              kind: "subset",
              pluginIds: canonicalRequest.mode.pluginIds,
            }
          : canonicalRequest.mode
      );
      if (!derivation.ok) {
        return providerSelectionResolution(
          selectedContentFromReleaseDerivationFailure(derivation.failure)
        );
      }
      const constructed = providerSelectionResolution(
        constructSelectedContent({
          derivation: derivation.value,
          selectionKind: canonicalRequest.mode.kind,
          marketplace: Object.freeze({
            identity: policy.contentAuthority,
            source: Object.freeze({ kind: "local", root: policy.locator }),
          }),
        })
      );
      if (constructed.kind === "Rejected") return constructed;

      const revalidated = yield* inspectCleanWorkspace();
      if (revalidated.kind === "Ineligible") {
        return providerSelectionResolution(selectedContentFromSourceIssues(revalidated.issues));
      }
      if (revalidated.snapshot.eligibilityBinding !== inspected.snapshot.eligibilityBinding) {
        return providerSelectionResolution(
          selectedContentRejected(
            "SelectionMismatch",
            "Local content changed before provider testing."
          )
        );
      }

      for (const [path, expected] of manifestBytes) {
        const localAttempt = yield* Effect.result(
          context.contentWorkspace.readFile({
            root: policy.locator,
            path,
            maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
          })
        );
        const local = classifyLocalSelectedContentManifest(path, expected, localAttempt);
        if (!local.ok) return providerSelectionResolution(local.result);
      }
      return constructed;
    });

  const selected = yield* selectWorkspace();
  if (selected.kind === "Rejected") {
    return {
      operation: "test",
      classification: "Blocked",
      selection: null,
      targets: rejectedTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    } satisfies ProviderTestResult;
  }
  // Disposable testing may replace selected members, but it never retires
  // other provider state. Canonical complete-set retirement belongs to sync.
  const retireOmitted = false;
  const initial = yield* inspectProviderTargets(
    selected.content,
    canonicalRequest.targets,
    context.nativeProviders,
    { retireOmitted },
    true
  );
  if (hasBlockingAssessment(initial)) {
    return completeResult(selected.content, blockedTargetResults(initial));
  }
  if (allTargetsConverged(initial)) {
    return completeResult(
      selected.content,
      Object.freeze(initial.map(convergedMutationTargetResult))
    );
  }

  const revalidated = yield* selectWorkspace();
  if (
    revalidated.kind === "Rejected" ||
    !sameSelectedContent(selected.content, revalidated.content)
  ) {
    return blockedResult(selected.content, sourceChangedTargets(canonicalRequest.targets));
  }
  const finalPreflight = yield* inspectProviderTargets(
    revalidated.content,
    canonicalRequest.targets,
    context.nativeProviders,
    { retireOmitted },
    true
  );
  if (hasBlockingAssessment(finalPreflight)) {
    return completeResult(revalidated.content, blockedTargetResults(finalPreflight));
  }
  const targets = allTargetsConverged(finalPreflight)
    ? Object.freeze(finalPreflight.map(convergedMutationTargetResult))
    : yield* reconcileProviderTargets(revalidated.content, finalPreflight, { retireOmitted });
  return completeResult(revalidated.content, targets);
});

function completeResult(
  content: SelectedContent,
  targets: ProviderTestResult["targets"]
): ProviderTestResult {
  return {
    operation: "test",
    classification: mutationClassification(targets),
    selection: selectedContentObservation(content),
    targets,
    issues: collectTargetIssues(targets),
  };
}

function blockedResult(
  content: SelectedContent,
  targets: ProviderTestResult["targets"]
): ProviderTestResult {
  return {
    operation: "test",
    classification: "Blocked",
    selection: selectedContentObservation(content),
    targets,
    issues: collectTargetIssues(targets),
  };
}
