import { parseCanonicalStatusRequest } from "../model/dto/mode";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceRegistration,
} from "../model/policy/marketplace";
import type { CanonicalStatusOutcome, CanonicalTargetStatus } from "../model/dto/outcome";
import { evaluateCapabilities, renderCompleteProjection, type AgentProviderProjection } from "../model/policy/projection";
import { visibleFingerprint, type VerifiedMemberIdentity } from "../model/policy/receipt";
import { issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../model/errors/deployment-result";
import { hasCanonicalProjectionCollision, type ReceiptObservation } from "../model/policy/state-machine";
import type { ProviderTarget } from "../model/dto/provider-target";
import { module } from "../module";
import type { VerifiedReleaseReader } from "../ports/artifact";
import type {
  AcceptedProviderProjectionBinding,
  CanonicalChannelReader,
  CanonicalChannelResolution,
} from "../ports/channel";
import type { ProviderTargetReader } from "../ports/provider";
import type { TargetReceiptReader } from "../ports/state";
import { canonicalStatusResult } from "./procedure-result";

export interface CanonicalStatusDependencies {
  readonly channel: CanonicalChannelReader;
  readonly releases: VerifiedReleaseReader;
  readonly provider: ProviderTargetReader;
  readonly receipts: TargetReceiptReader;
}

export const canonicalStatus = module.canonicalStatus.handler(
  async ({ context, input }) => canonicalStatusResult(
    executeCanonicalStatus(input, context.providers),
  ),
);

async function executeCanonicalStatus(
  input: unknown,
  ports: CanonicalStatusDependencies,
): Promise<DeploymentResult<readonly CanonicalStatusOutcome[]>> {
    const parsed = parseCanonicalStatusRequest(input);
    if (!parsed.ok) return parsed;
    const channel = await ports.channel.resolve(parsed.value.locator);
    const artifact = channel.ok && eligible(channel.value)
      ? await ports.releases.read(channel.value.releaseSet)
      : null;
    const outcomes: CanonicalStatusOutcome[] = [];
    for (const target of parsed.value.targets) {
      const authorityIssues: ProviderDeploymentIssue[] = [
        ...(channel.ok ? [] : channel.issues),
        ...(channel.ok && channel.value.kind === "blocked-acceptance-authority"
          ? [issue(
              "CHANNEL_NOT_ELIGIBLE",
              "channel.acceptanceAuthority",
              "Canonical content has no valid repository-governed acceptance authority",
              "accepted repository policy authority",
              "blocked-acceptance-authority",
            )]
          : []),
        ...(artifact === null || artifact.ok ? [] : artifact.issues),
      ];
      if (!channel.ok || !eligible(channel.value)) {
        outcomes.push(statusOutcome(target, "CONTENT_AHEAD_OF_ACCEPTANCE", authorityIssues));
        continue;
      }
      if (artifact === null || !artifact.ok || artifact.value.kind !== "complete-set") {
        outcomes.push(statusOutcome(target, "ACCEPTED_PENDING_CONVERGENCE", authorityIssues));
        continue;
      }
      const adapterProtocol = ports.provider.projectionAdapterProtocol(target);
      if (!adapterProtocol.ok) {
        outcomes.push(statusOutcome(target, "INCOMPATIBLE_PROVIDER", [...authorityIssues, ...adapterProtocol.issues]));
        continue;
      }
      const projection = renderCompleteProjection(target.provider, adapterProtocol.value, artifact.value);
      if (!projection.ok) {
        outcomes.push(statusOutcome(target, "DRIFTED", [...authorityIssues, ...projection.issues]));
        continue;
      }
      const [capability, inventory, receipt] = await Promise.all([
        ports.provider.inspectCapabilities(target, projection.value.artifactAuthority.contentAuthority),
        ports.provider.readInventory(target, projection.value.artifactAuthority.contentAuthority),
        ports.receipts.read(target),
      ]);
      const issues = [
        ...authorityIssues,
        ...(capability.ok ? [] : capability.issues),
        ...(inventory.ok ? [] : inventory.issues),
        ...(receipt.ok ? [] : receipt.issues),
      ];
      if (!capability.ok) {
        outcomes.push(statusOutcome(target, "INCOMPATIBLE_PROVIDER", issues));
        continue;
      }
      if (!inventory.ok || !receipt.ok) {
        outcomes.push(statusOutcome(target, "DRIFTED", issues));
        continue;
      }
      const binding = uniqueBinding(channel.value.projections, target.provider);
      if (binding === undefined) {
        outcomes.push(statusOutcome(target, "INCOMPATIBLE_PROVIDER", issues));
        continue;
      }
      const compatibility = evaluateCapabilities(projection.value.capabilityProfile, capability.value);
      if (
        !compatibility.compatible
        || binding.adapterProtocol !== projection.value.adapterProtocol
        || binding.capabilityProfileDigest !== projection.value.capabilityProfile.capabilityProfileDigest
      ) {
        outcomes.push(statusOutcome(target, "INCOMPATIBLE_PROVIDER", issues));
        continue;
      }
      if (hasCanonicalProjectionCollision(target, inventory.value, projection.value, receipt.value)) {
        outcomes.push(statusOutcome(target, "BLOCKED_COLLISION", issues));
        continue;
      }
      const expectedMarketplace = canonicalMarketplace(projection.value);
      const marketplaceClassification = classifyMarketplace(
        inventory.value.marketplace,
        receipt.value,
        expectedMarketplace,
      );
      if (marketplaceClassification !== null) {
        outcomes.push(statusOutcome(target, marketplaceClassification, issues));
        continue;
      }
      if (
        binding.projectionDigest !== projection.value.projectionDigest
        || binding.rendererProtocol !== projection.value.rendererProtocol
      ) {
        outcomes.push(statusOutcome(target, "DRIFTED", issues));
        continue;
      }
      const visible = await ports.provider.verifyProjection(target, projection.value);
      if (
        visible.ok
        && canonicalReceiptMatches(receipt.value, target, projection.value, channel.value)
      ) {
        outcomes.push(statusOutcome(target, "CONVERGED", issues));
      } else if (receipt.value.kind === "present") {
        outcomes.push(statusOutcome(target, "DRIFTED", visible.ok ? issues : [...issues, ...visible.issues]));
      } else {
        outcomes.push(statusOutcome(target, "ACCEPTED_PENDING_CONVERGENCE", visible.ok ? issues : [...issues, ...visible.issues]));
      }
    }
    return success(Object.freeze(outcomes));
}

function eligible(resolution: CanonicalChannelResolution): resolution is Extract<CanonicalChannelResolution, { kind: "accepted-pending-convergence" | "current-eligible" }> {
  return resolution.kind === "accepted-pending-convergence" || resolution.kind === "current-eligible";
}

function uniqueBinding(
  bindings: readonly AcceptedProviderProjectionBinding[],
  provider: AcceptedProviderProjectionBinding["provider"],
): AcceptedProviderProjectionBinding | undefined {
  const matches = bindings.filter((binding) => binding.provider === provider);
  return matches.length === 1 ? matches[0] : undefined;
}

function canonicalReceiptMatches(
  receipt: ReceiptObservation,
  target: ProviderTarget,
  projection: AgentProviderProjection,
  channel: Extract<CanonicalChannelResolution, { kind: "accepted-pending-convergence" | "current-eligible" }>,
): boolean {
  if (receipt.kind !== "present") return false;
  const body = receipt.receipt.body;
  const scope = body.scope;
  const expectedMembers: readonly VerifiedMemberIdentity[] = projection.members.map((member) => Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
  }));
  return body.provider === target.provider
    && body.targetDigest === target.targetDigest
    && scope.kind === "canonical-accepted"
    && scope.projectionDigest === projection.projectionDigest
    && scope.adapterProtocol === projection.adapterProtocol
    && scope.capabilityProfileDigest === projection.capabilityProfile.capabilityProfileDigest
    && scope.acceptanceDigest === channel.acceptanceDigest
    && scope.promotionDigest === channel.promotionDigest
    && scope.releaseSet.releaseSetDigest === channel.releaseSet.releaseSetDigest
    && sameMarketplaceState(body.marketplace, marketplaceState(canonicalMarketplace(projection)))
    && scope.visibleFingerprint === visibleFingerprint(expectedMembers)
    && sameMembers(scope.verifiedMembers, expectedMembers)
    && sameMembers(body.managedMembers, expectedMembers);
}

function canonicalMarketplace(projection: AgentProviderProjection): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: projection.provider,
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: projection.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function classifyMarketplace(
  live: import("../model/policy/marketplace").ProviderMarketplaceObservation,
  receipt: ReceiptObservation,
  expected: ProviderMarketplaceRegistration,
): Extract<CanonicalTargetStatus, "BLOCKED_COLLISION" | "DRIFTED"> | null {
  if (live.kind === "absent") {
    return receipt.kind === "present" ? "DRIFTED" : null;
  }
  if (receipt.kind === "absent") return "BLOCKED_COLLISION";
  const claimed = receipt.receipt.body.marketplace;
  if (
    live.state.provider !== claimed.provider
    || live.state.adapterProtocol !== claimed.adapterProtocol
    || live.state.marketplaceIdentity !== claimed.marketplaceIdentity
  ) {
    return "BLOCKED_COLLISION";
  }
  return !sameMarketplaceState(live.state, claimed)
    || !sameMarketplaceState(live.state, marketplaceState(expected))
    ? "DRIFTED"
    : null;
}

function sameMembers(
  actual: readonly VerifiedMemberIdentity[],
  expected: readonly VerifiedMemberIdentity[],
): boolean {
  return actual.length === expected.length && actual.every((member, index) => {
    const next = expected[index];
    return next !== undefined
      && member.pluginId === next.pluginId
      && member.nativeIdentity === next.nativeIdentity
      && member.providerSourceIdentity === next.providerSourceIdentity
      && sameArtifactAuthority(member.artifactAuthority, next.artifactAuthority)
      && member.memberFingerprint === next.memberFingerprint;
  });
}

function sameArtifactAuthority(
  left: VerifiedMemberIdentity["artifactAuthority"],
  right: VerifiedMemberIdentity["artifactAuthority"],
): boolean {
  return left.protocol === right.protocol
    && left.contentAuthority === right.contentAuthority
    && left.sourceCommit === right.sourceCommit;
}

function statusOutcome(
  target: ProviderTarget,
  status: CanonicalTargetStatus,
  issues: readonly ProviderDeploymentIssue[],
): CanonicalStatusOutcome {
  return Object.freeze({ target, status, issues: Object.freeze([...issues]) });
}
