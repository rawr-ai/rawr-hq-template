import type {
  SourceEligibilityIssue,
  StagedContentWorkspaceInspection,
  StagedContentWorkspacePolicy,
} from "../model/dto/content-workspace";
import type { RepositoryCheckResult } from "../model/dto/release-lifecycle";
import {
  classifyStagedMaterializationObservation,
  classifyStagedReleaseInputObservation,
  materializationObservationRequest,
  releaseInputObservationRequest,
  validateStagedContentWorkspacePolicy,
} from "../model/policy/staged-content-workspace";
import { module } from "../module";
import type { StagedContentWorkspaceObservationReader } from "../ports";

export const checkRepository = module.checkRepository.handler(async ({ context, input: request }) => {
  switch (request.kind) {
    case "staged": {
      const inspected = await inspectStagedRepository(
        context.releases.stagedSource,
        request.contentWorkspace,
      );
      if (inspected.kind === "SourceChanged") return stagedSourceChanged(inspected.detail);
      if (inspected.kind === "StagedContentWorkspaceIneligible") {
        return { kind: "RepositoryIneligible" as const, mode: "staged" as const, issues: inspected.issues };
      }
      const revalidated = await inspectStagedRepository(
        context.releases.stagedSource,
        request.contentWorkspace,
      );
      if (
        revalidated.kind !== "StagedContentWorkspaceEligible"
        || revalidated.snapshot.stagedBinding !== inspected.snapshot.stagedBinding
      ) {
        return stagedSourceChanged(
          revalidated.kind === "SourceChanged"
            ? revalidated.detail
            : "staged repository changed before final revalidation",
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
      const inspected = await context.releases.source.inspect(request.contentWorkspace);
      if (inspected.kind === "Ineligible") {
        return { kind: "RepositoryIneligible" as const, mode: "clean" as const, issues: inspected.issues };
      }
      const revalidated = await context.releases.source.revalidate(
        request.contentWorkspace,
        inspected.snapshot.eligibilityBinding,
      );
      if (revalidated.kind === "Ineligible") {
        return { kind: "RepositoryIneligible" as const, mode: "clean" as const, issues: revalidated.issues };
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

async function inspectStagedRepository(
  source: StagedContentWorkspaceObservationReader,
  policy: StagedContentWorkspacePolicy,
): Promise<StagedContentWorkspaceInspection> {
  const policyIssue = validateStagedContentWorkspacePolicy(policy);
  if (policyIssue !== undefined) return stagedIneligible(policyIssue);

  const releaseInputObservation = await source.observe(releaseInputObservationRequest(policy));
  const releaseInput = classifyStagedReleaseInputObservation(policy, releaseInputObservation);
  if (releaseInput.kind !== "ReadyForMaterialization") return releaseInput;

  const materialization = await source.observe(materializationObservationRequest(policy, releaseInput.memberRoots));
  return classifyStagedMaterializationObservation(policy, releaseInput, materialization);
}

function stagedIneligible(
  issue: SourceEligibilityIssue,
): Extract<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceIneligible" }> {
  return { kind: "StagedContentWorkspaceIneligible", issues: [issue] };
}

function stagedSourceChanged(detail: string): RepositoryCheckResult {
  return { kind: "SourceChanged", mode: "staged", detail };
}

function assertNever(value: never): never {
  throw new Error(`Unreachable repository check variant: ${String(value)}`);
}
