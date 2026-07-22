import type { VerifiedArtifactSnapshotV1 } from "../../../shared/release";

import { normalizeTargetedTestRequest, type TargetedTestInput } from "../model/dto/mode";
import type { TargetedTestProviderOperationOutcome } from "../model/dto/outcome";
import { issue, success, type DeploymentResult } from "../model/errors/deployment-result";
import { module } from "../module";
import type { VerifiedReleaseReader } from "../model/repositories/artifact";
import type { MechanicalEvidencePublisher } from "../model/repositories/evidence";
import type { ProviderTargetMutator, ProviderTargetReader } from "../model/repositories/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../model/repositories/state";
import {
  aggregateOutcome,
  attachMechanicalEvidence,
  createDeploymentActionAppliers,
  createProjectionPlans,
  executeProjectionPlans,
  resultFailure,
} from "./operation-support";
import { targetedTestOperationResult } from "./procedure-result";

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
  readonly evidence: MechanicalEvidencePublisher;
}

export const targetedTest = module.targetedTest.handler(async ({ context, input }) =>
  targetedTestOperationResult(
    executeTargetedTest(input, {
      releases: context.releases,
      provider: context.provider,
      providerMutator: context.providerMutator,
      receipts: context.receipts,
      receiptWriter: context.receiptWriter,
      identities: context.identities,
      identityWriter: context.identityWriter,
      projectionMaterializer: context.projectionMaterializer,
      marketplaceMaterializer: context.marketplaceMaterializer,
      evidence: context.evidence,
    })
  )
);

export async function executeTargetedTest(
  input: TargetedTestInput,
  ports: TargetedTestDependencies
): Promise<DeploymentResult<TargetedTestProviderOperationOutcome>> {
  const parsed = normalizeTargetedTestRequest(input);
  if (!parsed.ok) return parsed;
  const snapshots: VerifiedArtifactSnapshotV1[] = [];
  const artifactIssues = [];
  for (const ref of parsed.value.releases) {
    const read = await ports.releases.read(ref);
    if (read.ok) {
      if (
        read.value.kind !== "release" ||
        read.value.ref.releaseDigest !== ref.releaseDigest ||
        read.value.ref.artifactDigest !== ref.artifactDigest
      ) {
        artifactIssues.push(
          issue(
            "PROJECTION_MISMATCH",
            "artifact",
            "Artifact reader returned a snapshot for another release"
          )
        );
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
    authority: (projection) =>
      success(Object.freeze({ kind: "targeted-test", request, projection })),
  });
  const targetOutcomes = await executeProjectionPlans(plans, {
    provider: ports.provider,
    ...createDeploymentActionAppliers(ports),
    projectionMaterializer: ports.projectionMaterializer,
    marketplaceMaterializer: ports.marketplaceMaterializer,
  });
  const aggregate = aggregateOutcome(targetOutcomes);
  return success(
    await attachMechanicalEvidence(
      aggregate,
      plans,
      Object.freeze({ kind: "targeted-test", releases: request.releases }),
      request.evaluationProfile,
      ports.evidence
    )
  );
}
