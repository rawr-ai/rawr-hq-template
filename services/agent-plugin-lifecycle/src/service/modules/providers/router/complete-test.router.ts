import { parseProviderDeploymentRequest } from "../model/dto/mode";
import { issue, success, type DeploymentResult } from "../model/errors/deployment-result";
import { module } from "../module";
import type { VerifiedReleaseReader } from "../ports/artifact";
import type { MechanicalEvidencePublisher } from "../ports/evidence";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../ports/state";
import {
  aggregateOutcome,
  attachMechanicalEvidence,
  createDeploymentActionAppliers,
  createProjectionPlans,
  executeProjectionPlans,
  resultFailure,
} from "./operation-support";
import { providerOperationResult } from "./procedure-result";

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
  readonly evidence: MechanicalEvidencePublisher;
}

export const completeTest = module.completeTest.handler(
  async ({ context, input }) => providerOperationResult(
    executeCompleteTest(input, context.providers),
  ),
);

async function executeCompleteTest(
  input: unknown,
  ports: CompleteTestDependencies,
): Promise<DeploymentResult<import("../model/dto/outcome").ProviderOperationOutcome>> {
    const parsed = parseProviderDeploymentRequest(input);
    if (!parsed.ok) return parsed;
    if (parsed.value.kind !== "complete-test") {
      return resultFailure([issue("INVALID_MODE", "request.kind", "Complete-test application accepts only complete-test requests", "complete-test", parsed.value.kind)]);
    }
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
      ...createDeploymentActionAppliers(ports),
      projectionMaterializer: ports.projectionMaterializer,
      marketplaceMaterializer: ports.marketplaceMaterializer,
    });
    const aggregate = aggregateOutcome(targetOutcomes);
    return success(await attachMechanicalEvidence(
      aggregate,
      plans,
      Object.freeze({ kind: "complete-test", releaseSet: request.releaseSet }),
      request.evaluationProfile,
      ports.evidence,
    ));
}
