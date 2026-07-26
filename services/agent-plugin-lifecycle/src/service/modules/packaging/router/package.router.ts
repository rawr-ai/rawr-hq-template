import { Effect } from "effect";

import {
  type ContentWorkspaceInspection,
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
  MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
  validateCleanContentWorkspacePolicy,
} from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import { COWORK_PACKAGE_FORMAT } from "../model/dto/packaging-lifecycle";
import { coworkV1PackageDigest, createCoworkV1ArchiveRequest } from "../model/policy/cowork-v1";
import { priorOutputObservationLimit } from "../model/policy/package-output";
import {
  createPackagingFailure,
  mapPackageOutputFailure,
  packagedReleaseIdentity,
  packageRenderFailure,
  rejectedPackagingResult,
  sourceIssueMessage,
  unsettledPackageOutputFailure,
} from "../model/policy/package-result";
import { module } from "../module";

/**
 * @purpose Render and publish one deterministic package from exact reviewed content.
 * @capability Consume the module-provided clean source and package-output resources.
 * @behavior Inspect, derive, encode, revalidate, publish, and classify one closed result.
 * @relation Keep Packaging's transition inside its authored router rather than model policy.
 */
export const router = {
  package: module.package.effect(function* ({ context, input: request }) {
    const policy = request.contentWorkspace;
    const inspectContentWorkspace: Effect.Effect<ContentWorkspaceInspection> = Effect.gen(
      function* () {
        const policyIssue = validateCleanContentWorkspacePolicy(policy);
        if (policyIssue !== undefined) {
          return { kind: "Ineligible" as const, issues: [policyIssue] as const };
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
      }
    );

    const inspected = yield* inspectContentWorkspace;
    if (inspected.kind === "Ineligible") {
      return rejectedPackagingResult(
        createPackagingFailure(
          "SourceIneligible",
          "source-inspect",
          sourceIssueMessage(inspected.issues)
        )
      );
    }

    const derivation = deriveReleaseSelection(inspected.snapshot, request.mode);
    if (!derivation.ok) {
      return rejectedPackagingResult(
        createPackagingFailure(
          "ReleaseConstructionFailed",
          "release-construct",
          "ReleaseConstruction"
        )
      );
    }

    const encodedAttempt = yield* Effect.result(
      context.packageOutput.encodeCoworkV1(createCoworkV1ArchiveRequest(derivation.value))
    );
    if (encodedAttempt._tag === "Failure") {
      return rejectedPackagingResult(packageRenderFailure(encodedAttempt.failure));
    }
    const bytes = encodedAttempt.success;

    const revalidated = yield* inspectContentWorkspace;
    if (revalidated.kind === "Ineligible") {
      return rejectedPackagingResult(
        createPackagingFailure(
          "SourceIneligible",
          "source-revalidate",
          sourceIssueMessage(revalidated.issues)
        )
      );
    }
    if (revalidated.snapshot.eligibilityBinding !== inspected.snapshot.eligibilityBinding) {
      return rejectedPackagingResult(
        createPackagingFailure(
          "SourceIneligible",
          "source-revalidate",
          sourceIssueMessage([
            sourceEligibilityIssue(
              "SourceChanged",
              "repository, ref, index, worktree, or object bindings changed"
            ),
          ])
        )
      );
    }

    const packageDigest = coworkV1PackageDigest(bytes);
    const identity = {
      repositoryIdentity: inspected.snapshot.repositoryIdentity,
      sourceCommit: inspected.snapshot.sourceCommit,
      sourceTree: inspected.snapshot.sourceTree,
      release: packagedReleaseIdentity(derivation.value),
      format: COWORK_PACKAGE_FORMAT,
      outputPath: request.outputPath,
      packageDigest,
    } as const;
    const outputAttempt = yield* Effect.result(
      Effect.uninterruptible(
        context.packageOutput.publish({
          outputPath: request.outputPath,
          bytes: new Uint8Array(bytes),
          maxPriorOutputBytes: priorOutputObservationLimit(bytes.byteLength),
        })
      )
    );
    if (outputAttempt._tag === "Failure") {
      return {
        kind: "OutputUnsettled",
        primaryFailure: unsettledPackageOutputFailure(outputAttempt.failure),
        ...identity,
      };
    }
    const output = outputAttempt.success;
    switch (output.kind) {
      case "RejectedBeforeOutputMutation":
        return {
          kind: output.kind,
          primaryFailure: mapPackageOutputFailure(output.primaryFailure),
          ...(output.cleanupFailure === undefined
            ? {}
            : { cleanupFailure: mapPackageOutputFailure(output.cleanupFailure, true) }),
        };
      case "ReadOnlyConverged":
        return { kind: output.kind, ...identity };
      case "OutputReplacedVerified":
        return { kind: output.kind, priorOutput: output.priorOutput, ...identity };
      case "OutputUnsettled":
        return {
          kind: output.kind,
          primaryFailure: mapPackageOutputFailure(output.primaryFailure),
          ...(output.cleanupFailure === undefined
            ? {}
            : { cleanupFailure: mapPackageOutputFailure(output.cleanupFailure, true) }),
          ...identity,
        };
    }
  }),
};
