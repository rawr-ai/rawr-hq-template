import { parseProviderDeploymentRequest } from "../domain/mode";
import type { ProviderOperationOutcome } from "../domain/outcome";
import { issue, success, type DeploymentResult } from "../domain/result";
import type { VerifiedReleaseReader } from "../ports/artifact";
import type { ProviderCapsuleWriter } from "../ports/capsule";
import type { MechanicalEvidencePublisher } from "../ports/evidence";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type { ProviderMarketplaceMaterializer, ProviderPriorProjectionReader, ProviderProjectionMaterializer, TargetIdentityReader, TargetIdentityWriter, TargetReceiptReader, TargetReceiptWriter } from "../ports/state";
import {
  aggregateOutcome,
  attachMechanicalEvidence,
  createDeploymentActionApplier,
  createProjectionPlans,
  executeProjectionPlans,
  resultFailure,
} from "./shared";

export interface CompleteTestDependencies {
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
  readonly capsule: ProviderCapsuleWriter;
  readonly evidence: MechanicalEvidencePublisher;
}

export type CompleteTestApplication = (input: unknown) => Promise<DeploymentResult<ProviderOperationOutcome>>;

export function createCompleteTest(
  dependencies: () => CompleteTestDependencies,
): CompleteTestApplication {
  return async (input) => {
    const parsed = parseProviderDeploymentRequest(input);
    if (!parsed.ok) return parsed;
    if (parsed.value.kind !== "complete-test") {
      return resultFailure([issue("INVALID_MODE", "request.kind", "Complete-test application accepts only complete-test requests", "complete-test", parsed.value.kind)]);
    }
    const ports = dependencies();
    const read = await ports.releases.read(parsed.value.releaseSet);
    if (!read.ok) return read;
    if (read.value.kind !== "complete-set" || read.value.ref.releaseSetDigest !== parsed.value.releaseSet.releaseSetDigest) {
      return resultFailure([issue("PROJECTION_MISMATCH", "artifact", "Artifact reader returned a snapshot for another complete set")]);
    }
    const request = parsed.value;
    const plans = await createProjectionPlans({
      targets: request.targets,
      snapshot: read.value,
      sourceKind: "complete",
      dependencies: ports,
      authority: (projection) => success(Object.freeze({ kind: "complete-test", request, projection })),
    });
    const targetOutcomes = await executeProjectionPlans(plans, {
      provider: ports.provider,
      capsule: ports.capsule,
      applyAction: createDeploymentActionApplier(ports),
      projectionMaterializer: ports.projectionMaterializer,
      marketplaceMaterializer: ports.marketplaceMaterializer,
      priorProjections: ports.priorProjections,
    });
    const aggregate = aggregateOutcome(targetOutcomes);
    return success(await attachMechanicalEvidence(
      aggregate,
      plans,
      Object.freeze({ kind: "complete-test", releaseSet: request.releaseSet }),
      request.evaluationProfile,
      ports.evidence,
    ));
  };
}
