import { Effect } from "effect";
import type { SourceEligibilityIssue } from "#agent-plugin-lifecycle-service/model/dto/releases/content-workspace";
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
            context.stagedContentWorkspace.observeGitStagedIndex(
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
            context.stagedContentWorkspace.observeGitStagedIndex(
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
      const inspected = yield* context.source.inspect(request.contentWorkspace);
      if (inspected.kind === "Ineligible") {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "clean" as const,
          issues: inspected.issues,
        };
      }
      const revalidated = yield* context.source.revalidate(
        request.contentWorkspace,
        inspected.snapshot.eligibilityBinding
      );
      if (revalidated.kind === "Ineligible") {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "clean" as const,
          issues: revalidated.issues,
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
