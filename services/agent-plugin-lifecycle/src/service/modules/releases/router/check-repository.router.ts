import { Effect } from "effect";
import type { SourceEligibilityIssue } from "../../../model/dto/releases/content-workspace";
import {
  normalizeReleaseSourceChangedDetail,
  type RepositoryCheckResult,
} from "../model/dto/release-lifecycle";
import type {
  StagedContentWorkspaceInspection,
  StagedContentWorkspacePolicy,
} from "../model/dto/staged-content-workspace";
import {
  classifyStagedMaterializationObservation,
  classifyStagedReleaseInputObservation,
  materializationObservationRequest,
  releaseInputObservationRequest,
  validateStagedContentWorkspacePolicy,
} from "../model/policy/staged-content-workspace";
import type { StagedContentWorkspaceObservationReader } from "../model/ports/staged-content-workspace";
import { module } from "../module";

export const checkRepository = module.checkRepository.effect(function* ({
  context,
  input: request,
}) {
  switch (request.kind) {
    case "staged": {
      const inspected = yield* inspectStagedRepository(
        context.stagedSource,
        request.contentWorkspace
      );
      if (inspected.kind === "SourceChanged") return stagedSourceChanged(inspected.detail);
      if (inspected.kind === "StagedContentWorkspaceIneligible") {
        return {
          kind: "RepositoryIneligible" as const,
          mode: "staged" as const,
          issues: inspected.issues,
        };
      }
      const revalidated = yield* inspectStagedRepository(
        context.stagedSource,
        request.contentWorkspace
      );
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

function inspectStagedRepository(
  source: StagedContentWorkspaceObservationReader,
  policy: StagedContentWorkspacePolicy
): Effect.Effect<StagedContentWorkspaceInspection> {
  const policyIssue = validateStagedContentWorkspacePolicy(policy);
  if (policyIssue !== undefined) return Effect.succeed(stagedIneligible(policyIssue));

  return source.observe(releaseInputObservationRequest(policy)).pipe(
    Effect.flatMap((releaseInputObservation) => {
      const releaseInput = classifyStagedReleaseInputObservation(policy, releaseInputObservation);
      if (releaseInput.kind !== "ReadyForMaterialization") return Effect.succeed(releaseInput);
      return source
        .observe(materializationObservationRequest(policy, releaseInput.memberRoots))
        .pipe(
          Effect.map((materialization) =>
            classifyStagedMaterializationObservation(policy, releaseInput, materialization)
          )
        );
    })
  );
}

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
