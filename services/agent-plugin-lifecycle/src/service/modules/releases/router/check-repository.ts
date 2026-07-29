import { Effect } from "effect";
import {
  type SourceEligibilityIssue,
  sourceEligibilityIssue,
} from "#agent-plugin-lifecycle-service/model/dto/content-workspace";
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
  validateCleanContentWorkspacePolicy,
} from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "#agent-plugin-lifecycle-service/model/policy/release-payload-accounting";
import {
  normalizeReleaseSourceChangedDetail,
  type RepositoryCheckResult,
} from "../model/dto/release-lifecycle";
import type { StagedContentWorkspaceInspection } from "../model/dto/staged-content-workspace";
import {
  classifyStagedMaterializationObservation,
  classifyStagedObservationFailure,
  classifyStagedReleaseInputObservation,
  materializationObservationRequest,
  releaseInputObservationRequest,
  validateStagedContentWorkspacePolicy,
} from "../model/policy/staged-content-workspace";
import { module } from "../module";

/** Observes and revalidates one clean or staged repository snapshot for release use. */
export const checkRepository = module.checkRepository.effect(function* ({
  context,
  input: request,
}) {
  switch (request.kind) {
    case "staged": {
      const inspectStagedRepository = () =>
        Effect.gen(function* () {
          const policyIssue = validateStagedContentWorkspacePolicy(request.contentWorkspace);
          if (policyIssue !== undefined) return stagedIneligible(policyIssue);

          const releaseInputAttempt = yield* Effect.result(
            context.contentWorkspace.observeGitStagedIndex(
              releaseInputObservationRequest(request.contentWorkspace)
            )
          );
          if (releaseInputAttempt._tag === "Failure") {
            return classifyStagedObservationFailure(releaseInputAttempt.failure, "release-input");
          }
          const releaseInput = classifyStagedReleaseInputObservation(
            request.contentWorkspace,
            releaseInputAttempt.success
          );
          if (releaseInput.kind !== "ReadyForMaterialization") return releaseInput;

          const materializationAttempt = yield* Effect.result(
            context.contentWorkspace.observeGitStagedIndex(
              materializationObservationRequest(request.contentWorkspace, releaseInput.memberRoots)
            )
          );
          return materializationAttempt._tag === "Failure"
            ? classifyStagedObservationFailure(materializationAttempt.failure, "payloads")
            : classifyStagedMaterializationObservation(
                request.contentWorkspace,
                releaseInput,
                materializationAttempt.success
              );
        });

      const inspected = yield* inspectStagedRepository();
      if (inspected.kind === "SourceChanged") return stagedSourceChanged(inspected.detail);
      if (inspected.kind === "StagedContentWorkspaceIneligible") {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "staged" as const,
          issues: inspected.issues,
        };
      }
      const revalidated = yield* inspectStagedRepository();
      if (
        revalidated.kind !== "StagedContentWorkspaceEligible" ||
        revalidated.snapshot.stagedBinding !== inspected.snapshot.stagedBinding
      ) {
        return stagedSourceChanged(
          revalidated.kind === "SourceChanged"
            ? revalidated.detail
            : "staged repository changed before final revalidation"
        );
      }
      return {
        kind: "StagedRepositoryEligible" as const,
        repositoryIdentity: revalidated.snapshot.repositoryIdentity,
        refName: revalidated.snapshot.refName,
        headCommit: revalidated.snapshot.headCommit,
        headTree: revalidated.snapshot.headTree,
        stagedBinding: revalidated.snapshot.stagedBinding,
      };
    }
    case "clean": {
      const policy = request.contentWorkspace;
      const inspectCleanRepository = () =>
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
              maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
            })
          );
          const payloads = classifyCleanPayloads(releaseInput.value, payloadAttempt);
          if (!payloads.ok) return payloads.result;

          const openingEvidenceAttempt = yield* Effect.result(
            context.contentWorkspace.captureGitWorkspaceEvidence({
              root: payloads.value.anchor.root,
              remoteSelection: { kind: "Named", remoteName: policy.remoteName },
              refName: policy.refName,
              admittedPaths: payloads.value.admittedPaths,
              consumedRoots: payloads.value.consumedRoots,
              objectFormat: payloads.value.anchor.objectFormat,
              maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
              maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
              maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
              maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
            })
          );
          const openingEvidence = classifyCleanWorkspaceEvidence(
            policy,
            payloads.value,
            openingEvidenceAttempt
          );
          if (!openingEvidence.ok) return openingEvidence.result;

          const closingEvidenceAttempt = yield* Effect.result(
            context.contentWorkspace.captureGitWorkspaceEvidence({
              root: payloads.value.anchor.root,
              remoteSelection: { kind: "Named", remoteName: policy.remoteName },
              refName: policy.refName,
              admittedPaths: payloads.value.admittedPaths,
              consumedRoots: payloads.value.consumedRoots,
              objectFormat: payloads.value.anchor.objectFormat,
              maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
              maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
              maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
              maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
            })
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

      const inspected = yield* inspectCleanRepository();
      if (inspected.kind === "Ineligible") {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "clean" as const,
          issues: inspected.issues,
        };
      }
      const revalidated = yield* inspectCleanRepository();
      if (revalidated.kind === "Ineligible") {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "clean" as const,
          issues: revalidated.issues,
        };
      }
      if (revalidated.snapshot.eligibilityBinding !== inspected.snapshot.eligibilityBinding) {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "clean" as const,
          issues: [
            sourceEligibilityIssue(
              "SourceChanged",
              "repository, ref, index, worktree, or object bindings changed"
            ),
          ],
        };
      }
      return {
        kind: "CleanRepositoryEligible" as const,
        repositoryIdentity: revalidated.snapshot.repositoryIdentity,
        refName: request.contentWorkspace.refName,
        sourceCommit: revalidated.snapshot.sourceCommit,
        sourceTree: revalidated.snapshot.sourceTree,
        eligibilityBinding: revalidated.snapshot.eligibilityBinding,
      };
    }
    default:
      return assertNever(request);
  }
});

function stagedIneligible(
  issue: SourceEligibilityIssue
): Extract<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceIneligible" }> {
  return { kind: "StagedContentWorkspaceIneligible", issues: [issue] };
}

function stagedSourceChanged(detail: string): RepositoryCheckResult {
  return {
    kind: "SourceChanged",
    mode: "staged",
    detail: normalizeReleaseSourceChangedDetail(detail),
  };
}

function assertNever(value: never): never {
  throw new Error(`Unreachable repository check variant: ${String(value)}`);
}
