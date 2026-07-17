import { parseProviderDeploymentRequest } from "../domain/mode";
import type { ProviderOperationOutcome } from "../domain/outcome";
import type { AgentProviderProjection } from "../domain/projection";
import { failure, issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../domain/result";
import type { VerifiedReleaseReader } from "../ports/artifact";
import type { ProviderCapsuleWriter } from "../ports/capsule";
import type { AcceptedProviderProjectionBinding, CanonicalChannelReader, CanonicalChannelResolution } from "../ports/channel";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type { ProviderMarketplaceMaterializer, ProviderPriorProjectionReader, ProviderProjectionMaterializer, TargetIdentityReader, TargetIdentityWriter, TargetReceiptReader, TargetReceiptWriter } from "../ports/state";
import {
  aggregateOutcome,
  createDeploymentActionApplier,
  createProjectionPlans,
  executeProjectionPlans,
  inspectTargetsAsBlocked,
  resultFailure,
} from "./shared";

export interface CanonicalSyncDependencies {
  readonly channel: CanonicalChannelReader;
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
}

export type CanonicalSyncApplication = (input: unknown) => Promise<DeploymentResult<ProviderOperationOutcome>>;

export function createCanonicalSync(
  dependencies: () => CanonicalSyncDependencies,
): CanonicalSyncApplication {
  return async (input) => {
    const parsed = parseProviderDeploymentRequest(input);
    if (!parsed.ok) return parsed;
    if (parsed.value.kind !== "canonical-sync") {
      return resultFailure([issue("INVALID_MODE", "request.kind", "Canonical-sync application accepts only canonical-sync requests", "canonical-sync", parsed.value.kind)]);
    }
    const ports = dependencies();
    const request = parsed.value;
    const resolved = await ports.channel.resolve(request.locator);
    if (!resolved.ok) {
      const plans = await inspectTargetsAsBlocked(request.targets, ports, resolved.issues);
      return success(aggregateOutcome(await executeProjectionPlans(plans, runtime(ports))));
    }
    if (!isEligible(resolved.value)) {
      const channelIssue = issue("CHANNEL_NOT_ELIGIBLE", "request.channel", "Fixed channel does not resolve an accepted promoted complete set", "accepted-pending-convergence|current-eligible", resolved.value.kind);
      const plans = await inspectTargetsAsBlocked(request.targets, ports, [channelIssue]);
      return success(aggregateOutcome(await executeProjectionPlans(plans, runtime(ports))));
    }
    const artifact = await ports.releases.read(resolved.value.releaseSet);
    if (!artifact.ok) {
      const plans = await inspectTargetsAsBlocked(request.targets, ports, artifact.issues);
      return success(aggregateOutcome(await executeProjectionPlans(plans, runtime(ports))));
    }
    if (artifact.value.kind !== "complete-set" || artifact.value.ref.releaseSetDigest !== resolved.value.releaseSet.releaseSetDigest) {
      const plans = await inspectTargetsAsBlocked(request.targets, ports, [issue("PROJECTION_MISMATCH", "artifact", "Artifact reader returned another complete set")]);
      return success(aggregateOutcome(await executeProjectionPlans(plans, runtime(ports))));
    }
    const channel = resolved.value;
    const plans = await createProjectionPlans({
      targets: request.targets,
      snapshot: artifact.value,
      sourceKind: "complete",
      dependencies: ports,
      authority: (projection) => {
        const binding = uniqueBinding(channel.projections, projection.provider);
        if (!binding.ok) return binding;
        const issues = bindingIssues(binding.value, projection);
        if (issues.length > 0) return failure([issues[0]!, ...issues.slice(1)]);
        return success(Object.freeze({
          kind: "canonical-sync",
          request,
          projection,
          acceptanceDigest: channel.acceptanceDigest,
          promotionDigest: channel.promotionDigest,
        }));
      },
    });
    const targetOutcomes = await executeProjectionPlans(plans, runtime(ports));
    return success(aggregateOutcome(targetOutcomes));
  };
}

function isEligible(resolution: CanonicalChannelResolution): resolution is Extract<CanonicalChannelResolution, { kind: "accepted-pending-convergence" | "current-eligible" }> {
  return resolution.kind === "accepted-pending-convergence" || resolution.kind === "current-eligible";
}

function uniqueBinding(
  bindings: readonly AcceptedProviderProjectionBinding[],
  provider: AcceptedProviderProjectionBinding["provider"],
): DeploymentResult<AcceptedProviderProjectionBinding> {
  const matches = bindings.filter((binding) => binding.provider === provider);
  return matches.length === 1
    ? success(matches[0]!)
    : resultFailure([issue("PROJECTION_MISMATCH", "channel.projections", "Canonical channel must bind exactly one projection per selected provider", "one binding", String(matches.length))]);
}

function bindingIssues(
  binding: AcceptedProviderProjectionBinding,
  projection: AgentProviderProjection,
): readonly ProviderDeploymentIssue[] {
  const issues: ProviderDeploymentIssue[] = [];
  if (binding.rendererProtocol !== projection.rendererProtocol) issues.push(issue("PROJECTION_MISMATCH", "projection.rendererProtocol", "Accepted renderer protocol differs from live projection", binding.rendererProtocol, projection.rendererProtocol));
  if (binding.adapterProtocol !== projection.adapterProtocol) issues.push(issue("ADAPTER_PROTOCOL_MISMATCH", "projection.adapterProtocol", "Accepted adapter protocol differs from live provider adapter", binding.adapterProtocol, projection.adapterProtocol));
  if (binding.capabilityProfileDigest !== projection.capabilityProfile.capabilityProfileDigest) issues.push(issue("CAPABILITY_MISMATCH", "projection.capabilityProfileDigest", "Accepted capability profile differs from live projection", binding.capabilityProfileDigest, projection.capabilityProfile.capabilityProfileDigest));
  if (binding.projectionDigest !== projection.projectionDigest) issues.push(issue("PROJECTION_MISMATCH", "projection.projectionDigest", "Accepted projection digest differs from rendered immutable artifact", binding.projectionDigest, projection.projectionDigest));
  return Object.freeze(issues);
}

function runtime(ports: CanonicalSyncDependencies) {
  return {
    provider: ports.provider,
    capsule: ports.capsule,
    applyAction: createDeploymentActionApplier(ports),
    projectionMaterializer: ports.projectionMaterializer,
    marketplaceMaterializer: ports.marketplaceMaterializer,
    priorProjections: ports.priorProjections,
  };
}
