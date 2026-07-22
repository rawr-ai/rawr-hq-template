import { normalizeCompleteTestRequest, type CompleteTestInput } from "../model/dto/mode";
import { issue, success, type DeploymentResult } from "../model/errors/deployment-result";
import { module } from "../module";
import type {
  CompleteTestProviderOperationOutcome,
  CompleteTestTargetOperationOutcome,
  ProviderProjectionBinding,
  UnboundTargetOperationOutcome,
} from "../model/dto/outcome";
import type { ProviderTargetPlan } from "../model/policy/state-machine";
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
import { completeTestOperationResult } from "./procedure-result";

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

export const completeTest = module.completeTest.handler(async ({ context, input }) =>
  completeTestOperationResult(
    executeCompleteTest(input, {
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

export async function executeCompleteTest(
  input: CompleteTestInput,
  ports: CompleteTestDependencies
): Promise<DeploymentResult<CompleteTestProviderOperationOutcome>> {
  const parsed = normalizeCompleteTestRequest(input);
  if (!parsed.ok) return parsed;
  const read = await ports.releases.read(parsed.value.releaseSet);
  if (!read.ok) return read;
  if (
    read.value.kind !== "complete-set" ||
    read.value.ref.releaseSetDigest !== parsed.value.releaseSet.releaseSetDigest
  ) {
    return resultFailure([
      issue(
        "PROJECTION_MISMATCH",
        "artifact",
        "Artifact reader returned a snapshot for another complete set"
      ),
    ]);
  }
  const request = parsed.value;
  const plans = await createProjectionPlans({
    targets: request.targets,
    snapshot: read.value,
    sourceKind: "complete",
    dependencies: ports,
    authority: (projection) =>
      success(Object.freeze({ kind: "complete-test", request, projection })),
  });
  const targetOutcomes = await executeProjectionPlans(plans, {
    provider: ports.provider,
    ...createDeploymentActionAppliers(ports),
    projectionMaterializer: ports.projectionMaterializer,
    marketplaceMaterializer: ports.marketplaceMaterializer,
  });
  const boundOutcomes = bindCompleteProjectionOutcomes(plans, targetOutcomes);
  const aggregate = aggregateOutcome(boundOutcomes);
  return success(
    await attachMechanicalEvidence(
      aggregate,
      plans,
      Object.freeze({ kind: "complete-test", releaseSet: request.releaseSet }),
      request.evaluationProfile,
      ports.evidence
    )
  );
}

export function bindCompleteProjectionOutcomes(
  plans: readonly ProviderTargetPlan[],
  outcomes: readonly UnboundTargetOperationOutcome[]
): readonly CompleteTestTargetOperationOutcome[] {
  const plansByTarget = new Map(plans.map((plan) => [plan.target.targetDigest, plan]));
  const bound: CompleteTestTargetOperationOutcome[] = [];

  for (const [index, outcome] of outcomes.entries()) {
    if (outcome.status === "blocked" || outcome.status === "failed") {
      bound.push(outcome);
      continue;
    }
    const projection = plansByTarget.get(outcome.target.targetDigest)?.projection;
    if (
      projection === null ||
      projection === undefined ||
      projection.provider !== outcome.target.provider
    ) {
      const bindingIssue = issue(
        "PROJECTION_MISMATCH",
        `targets[${index}].projectionBinding`,
        "Successful complete-test outcome requires its exact rendered projection binding",
        outcome.target.provider,
        projection?.provider ?? "missing"
      );
      bound.push(
        Object.freeze({
          target: outcome.target,
          status: "failed",
          events: Object.freeze([
            ...outcome.events,
            Object.freeze({
              phase: "failed" as const,
              target: outcome.target,
              issues: Object.freeze([bindingIssue]),
            }),
          ]),
          issues: Object.freeze([...outcome.issues, bindingIssue]),
          visibleFingerprint: outcome.visibleFingerprint,
          projectionBinding: null,
        })
      );
      continue;
    }
    const projectionBinding: ProviderProjectionBinding = Object.freeze({
      provider: projection.provider,
      projectionDigest: projection.projectionDigest,
      rendererProtocol: projection.rendererProtocol,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
    });
    bound.push(Object.freeze({ ...outcome, projectionBinding }));
  }

  return Object.freeze(bound);
}
