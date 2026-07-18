import type { VerifiedArtifactSnapshotV1 } from "../../../shared/release";

import { parseProviderDeploymentRequest } from "../model/dto/mode";
import { issue, success, type DeploymentResult } from "../model/errors/deployment-result";
import { module } from "../module";
import type { VerifiedReleaseReader } from "../ports/artifact";
import type { MechanicalEvidencePublisher } from "../ports/evidence";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderPriorProjectionReader,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../ports/state";
import type { ProviderUndoWriter } from "../ports/undo-writer";
import {
  aggregateOutcome,
  attachMechanicalEvidence,
  createDeploymentActionApplier,
  createProjectionPlans,
  executeProjectionPlans,
  resultFailure,
} from "./operation-support";
import { providerOperationResult } from "./procedure-result";

export interface TargetedTestDependencies {
  readonly releases: VerifiedReleaseReader;
  readonly provider: ProviderTargetReader;
  readonly providerMutator: ProviderTargetMutator;
  readonly receipts: TargetReceiptReader;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identities: TargetIdentityReader;
  readonly identityWriter: TargetIdentityWriter;
  readonly projectionMaterializer: ProviderProjectionMaterializer;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
  readonly priorProjections: ProviderPriorProjectionReader;
  readonly undoWriter: ProviderUndoWriter;
  readonly evidence: MechanicalEvidencePublisher;
}

export const targetedTest = module.targetedTest.handler(
  async ({ context, input }) => providerOperationResult(
    executeTargetedTest(input, context.providers),
  ),
);

async function executeTargetedTest(
  input: unknown,
  ports: TargetedTestDependencies,
): Promise<DeploymentResult<import("../model/dto/outcome").ProviderOperationOutcome>> {
    const parsed = parseProviderDeploymentRequest(input);
    if (!parsed.ok) return parsed;
    if (parsed.value.kind !== "targeted-test") {
      return resultFailure([issue("INVALID_MODE", "request.kind", "Targeted-test application accepts only targeted-test requests", "targeted-test", parsed.value.kind)]);
    }
    const snapshots: VerifiedArtifactSnapshotV1[] = [];
    const artifactIssues = [];
    for (const ref of parsed.value.releases) {
      const read = await ports.releases.read(ref);
      if (read.ok) {
        if (read.value.kind !== "release" || read.value.ref.releaseDigest !== ref.releaseDigest || read.value.ref.artifactDigest !== ref.artifactDigest) {
          artifactIssues.push(issue("PROJECTION_MISMATCH", "artifact", "Artifact reader returned a snapshot for another release"));
        } else snapshots.push(read.value);
      } else artifactIssues.push(...read.issues);
    }
    if (artifactIssues.length > 0) return resultFailure(artifactIssues);
    const request = parsed.value;
    const plans = await createProjectionPlans({
      targets: request.targets,
      snapshot: Object.freeze(snapshots),
      sourceKind: "targeted",
      dependencies: ports,
      authority: (projection) => success(Object.freeze({ kind: "targeted-test", request, projection })),
    });
    const targetOutcomes = await executeProjectionPlans(plans, {
      provider: ports.provider,
      undoWriter: ports.undoWriter,
      applyAction: createDeploymentActionApplier(ports),
      projectionMaterializer: ports.projectionMaterializer,
      marketplaceMaterializer: ports.marketplaceMaterializer,
      priorProjections: ports.priorProjections,
    });
    const aggregate = aggregateOutcome(targetOutcomes);
    return success(await attachMechanicalEvidence(
      aggregate,
      plans,
      Object.freeze({ kind: "targeted-test", releases: request.releases }),
      request.evaluationProfile,
      ports.evidence,
    ));
}
