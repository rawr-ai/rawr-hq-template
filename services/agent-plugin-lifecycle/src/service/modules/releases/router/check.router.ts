import { Effect } from "effect";
import type { SourceEligibilityIssue } from "#agent-plugin-lifecycle-service/model/dto/content-workspace";
import type {
  DerivedReleaseSelection,
  ReleaseSelection,
} from "#agent-plugin-lifecycle-service/model/dto/release-derivation";
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
import type {
  CheckResult,
  ReleaseCheckIssue,
  ReleaseDerivationIdentity,
} from "../model/dto/release-lifecycle";
import { releaseConstructionIssue } from "../model/dto/release-lifecycle";
import { module } from "../module";

/** Checks whether one exact content snapshot can produce the requested release selection. */
export const check = module.check.effect(function* ({ context, input: request }) {
  const policy = request.contentWorkspace;
  const policyIssue = validateCleanContentWorkspacePolicy(policy);
  if (policyIssue !== undefined) return ineligibleReport(request.mode, [policyIssue]);

  const anchorAttempt = yield* Effect.result(
    context.contentWorkspace.inspectGitWorkspace({
      locator: policy.locator,
      remoteSelection: { kind: "Named", remoteName: policy.remoteName },
      refName: policy.refName,
    })
  );
  const anchor = classifyCleanContentWorkspaceAnchor(policy, anchorAttempt);
  if (!anchor.ok) return ineligibleReport(request.mode, anchor.result.issues);

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
  if (!tree.ok) return ineligibleReport(request.mode, tree.result.issues);

  const releaseInputAttempt = yield* Effect.result(
    context.contentWorkspace.readGitBlob({
      root: tree.value.anchor.root,
      blob: tree.value.releaseInputEntry.objectId,
      objectFormat: tree.value.anchor.objectFormat,
      maxBytes: MAX_CLEAN_RELEASE_INPUT_BYTES,
    })
  );
  const releaseInput = classifyCleanReleaseInput(policy, tree.value, releaseInputAttempt);
  if (!releaseInput.ok) return ineligibleReport(request.mode, releaseInput.result.issues);

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
  if (!payloads.ok) return ineligibleReport(request.mode, payloads.result.issues);

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
  if (!openingEvidence.ok) return ineligibleReport(request.mode, openingEvidence.result.issues);

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
  if (!closingEvidence.ok) return ineligibleReport(request.mode, closingEvidence.result.issues);

  const inspected = finishCleanContentWorkspaceInspection(
    policy,
    payloads.value,
    openingEvidence.value,
    closingEvidence.value
  );
  if (inspected.kind === "Ineligible") return ineligibleReport(request.mode, inspected.issues);
  const derivation = deriveReleaseSelection(inspected.snapshot, request.mode);
  if (!derivation.ok) {
    return {
      kind: "IneligibleReport" as const,
      mode: request.mode,
      issues: [releaseConstructionIssue(derivation.failure.detail)] as const,
    };
  }
  return {
    kind: "EligibleReport" as const,
    derivation: releaseDerivationIdentity(derivation.value),
    eligibilityBinding: inspected.snapshot.eligibilityBinding,
  };
});

function releaseDerivationIdentity(derivation: DerivedReleaseSelection): ReleaseDerivationIdentity {
  if (derivation.releaseSet !== undefined) {
    return Object.freeze({
      kind: "complete-set",
      releaseSetDigest: derivation.releaseSet.releaseSetDigest,
      members: Object.freeze(
        derivation.releaseSet.body.members.map((member) =>
          Object.freeze({
            pluginId: member.pluginId,
            releaseDigest: member.releaseDigest,
            artifactDigest: member.artifactDigest,
          })
        )
      ),
    });
  }
  const release = derivation.releases[0]!;
  return Object.freeze({
    kind: "release",
    pluginId: release.artifactBody.releaseBody.pluginId,
    releaseDigest: release.releaseDigest,
    artifactDigest: release.artifactDigest,
  });
}

function ineligibleReport(
  mode: ReleaseSelection,
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]
): CheckResult {
  return { kind: "IneligibleReport", mode, issues: sourceIssues(issues) };
}

function sourceIssues(
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]
): readonly [ReleaseCheckIssue, ...ReleaseCheckIssue[]] {
  return issues.map((issue) => Object.freeze({ kind: "SourceEligibility", issue })) as [
    ReleaseCheckIssue,
    ...ReleaseCheckIssue[],
  ];
}
