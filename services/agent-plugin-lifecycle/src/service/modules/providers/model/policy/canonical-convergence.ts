import { compareCanonical } from "../helpers/canonical";
import {
  issue,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
} from "../errors/deployment-result";
import type {
  CanonicalConvergencePlan,
  CanonicalConvergenceStep,
  CanonicalNativeConvergenceStatus,
  CanonicalNativeMutationAction,
  PlanCanonicalConvergenceInput,
} from "../dto/canonical-convergence";
import type { ProviderTarget } from "../dto/provider-target";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceRegistration,
} from "./marketplace";
import {
  evaluateCapabilities,
  type AgentProviderProjection,
  type CapabilityEvaluation,
  type ProviderProjectionMember,
} from "./projection";
import type {
  NativeMemberObservation,
  NativeStandaloneExposureObservation,
  ProviderInventory,
} from "./state-machine";

const EMPTY_ISSUES: readonly [] = Object.freeze([]);
const EMPTY_STEPS: readonly [] = Object.freeze([]);

/**
 * Plans only the native delta for the selected complete projection. The
 * marketplace and embedded artifact provenance jointly establish ownership;
 * neither one is sufficient on its own.
 */
export function planCanonicalConvergence(
  input: PlanCanonicalConvergenceInput,
): CanonicalConvergencePlan {
  const { capabilities, desired, observation } = input;
  const { projection } = desired;
  const target = observation.kind === "observed"
    ? observation.inventory.target
    : observation.target;
  if (target.provider !== projection.provider) {
    return blocked("INCOMPATIBLE_PROVIDER", target, projection, [issue(
      "PROJECTION_MISMATCH",
      "target.provider",
      "Selected projection belongs to another native provider target",
      projection.provider,
      target.provider,
    )]);
  }
  if (observation.kind === "ambiguous-provenance") {
    return blocked("BLOCKED_COLLISION", target, projection, [issue(
      "BLOCKED_COLLISION",
      "target.inventory.provenance",
      "Native marketplace state has missing or invalid embedded RAWR provenance",
      projection.marketplace.identity,
      observation.reason,
    )]);
  }
  const inventory = observation.inventory;
  const observationIssue = capabilityObservationIssue(projection, capabilities);
  if (observationIssue !== undefined) {
    return blocked("INCOMPATIBLE_PROVIDER", target, projection, [observationIssue]);
  }
  const capability = evaluateCapabilities(projection.capabilityProfile, capabilities);
  if (!capability.compatible) {
    return blocked("INCOMPATIBLE_PROVIDER", target, projection, [capabilityIssue(
      projection,
      capability,
    )]);
  }

  const registration = registrationFor(projection);

  const collisionIssues = liveCollisionIssues(inventory, projection);
  const firstCollision = collisionIssues[0];
  if (firstCollision !== undefined) {
    return blocked("BLOCKED_COLLISION", target, projection, [
      firstCollision,
      ...collisionIssues.slice(1),
    ]);
  }

  const marketplaceActions: CanonicalNativeMutationAction[] = [];
  const expectedMarketplace = marketplaceState(registration);
  if (
    inventory.marketplace.kind === "absent"
    || !sameMarketplaceState(inventory.marketplace.state, expectedMarketplace)
  ) {
    marketplaceActions.push(Object.freeze({
      kind: "SetMarketplace",
      role: "final",
      target,
      expected: inventory.marketplace,
      registration,
    }));
  }

  const managed = [...inventory.members].sort(compareNativeMembers);
  const refreshRetire: NativeMemberObservation[] = [];
  const omittedRetire: NativeMemberObservation[] = [];
  const install: ProviderProjectionMember[] = [];
  const enable: ProviderProjectionMember[] = [];
  const retained = new Set<NativeMemberObservation>();

  for (const desired of projection.members) {
    const related = managed.filter((live) =>
      live.pluginId === desired.pluginId || live.nativeIdentity === desired.nativeIdentity);
    if (related.length > 1) {
      return blocked("BLOCKED_COLLISION", target, projection, [issue(
        "BLOCKED_COLLISION",
        `target.members.${desired.pluginId}`,
        "Native provider exposes more than one managed member for the selected identity",
        "one managed member",
        String(related.length),
      )]);
    }
    const live = related[0];
    if (live === undefined) {
      install.push(desired);
      continue;
    }
    retained.add(live);
    if (!sameProjectedMember(live, desired) || !sameVisibility(live, desired)) {
      refreshRetire.push(live);
      install.push(desired);
      continue;
    }
    if (live.enablement === "disabled") enable.push(desired);
  }

  for (const live of managed) {
    if (!retained.has(live)) omittedRetire.push(live);
  }

  refreshRetire.sort(compareNativeMembers);
  omittedRetire.sort(compareNativeMembers);
  install.sort(compareProjectedMembers);
  enable.sort(compareProjectedMembers);
  const steps: CanonicalConvergenceStep[] = marketplaceActions.map(
    (action): CanonicalConvergenceStep => Object.freeze({ kind: "mutate", action }),
  );
  for (const member of refreshRetire) {
    steps.push(Object.freeze({
      kind: "mutate",
      action: Object.freeze({
      kind: "RetireMember",
      target,
      activeMarketplace: registration,
      member,
      }),
    }));
    steps.push(Object.freeze({ kind: "verify-retired", target, nativeIdentity: member.nativeIdentity }));
  }
  for (const member of install) {
    steps.push(Object.freeze({
      kind: "mutate",
      action: Object.freeze({
        kind: "InstallMember",
        target,
        activeMarketplace: registration,
        member,
      }),
    }));
  }
  for (const member of enable) {
    steps.push(Object.freeze({
      kind: "mutate",
      action: Object.freeze({
        kind: "EnableMember",
        target,
        activeMarketplace: registration,
        member,
      }),
    }));
  }
  steps.push(Object.freeze({ kind: "verify-selected", target, projection }));
  for (const member of omittedRetire) {
    steps.push(Object.freeze({
      kind: "mutate",
      action: Object.freeze({
        kind: "RetireMember",
        target,
        activeMarketplace: registration,
        member,
      }),
    }));
    steps.push(Object.freeze({ kind: "verify-retired", target, nativeIdentity: member.nativeIdentity }));
  }
  if (omittedRetire.length > 0) {
    steps.push(Object.freeze({ kind: "verify-final", target, projection }));
  }

  const mutationCount = steps.filter((step) => step.kind === "mutate").length;

  return Object.freeze({
    status: mutationCount === 0 ? "CONVERGED" : "DRIFTED",
    target,
    projection,
    steps: Object.freeze(steps),
    issues: EMPTY_ISSUES,
  });
}

function capabilityObservationIssue(
  projection: AgentProviderProjection,
  capabilities: PlanCanonicalConvergenceInput["capabilities"],
): ProviderDeploymentIssue | undefined {
  if (capabilities.provider !== projection.provider) {
    return issue(
      "PROJECTION_MISMATCH",
      "target.capabilities.provider",
      "Native capability observation belongs to another provider",
      projection.provider,
      capabilities.provider,
    );
  }
  if (capabilities.adapterProtocol !== projection.adapterProtocol) {
    return issue(
      "ADAPTER_PROTOCOL_MISMATCH",
      "target.capabilities.adapterProtocol",
      "Native capability observation belongs to another adapter protocol",
      projection.adapterProtocol,
      capabilities.adapterProtocol,
    );
  }
  return undefined;
}

function capabilityIssue(
  projection: AgentProviderProjection,
  capability: CapabilityEvaluation,
): ProviderDeploymentIssue {
  return issue(
    "CAPABILITY_MISMATCH",
    "target.capabilities",
    "Native provider does not implement the complete projection capability profile",
    "no missing capabilities",
    capability.missing.join(","),
  );
}

function liveCollisionIssues(
  inventory: ProviderInventory,
  projection: AgentProviderProjection,
): readonly ProviderDeploymentIssue[] {
  const issues: ProviderDeploymentIssue[] = [];
  const owner = projection.marketplace.identity;
  if (inventory.marketplace.kind === "present" && (
    inventory.marketplace.state.provider !== projection.provider
    || inventory.marketplace.state.adapterProtocol !== projection.adapterProtocol
    || inventory.marketplace.state.marketplaceIdentity !== owner
  )) {
    issues.push(issue(
      "BLOCKED_COLLISION",
      "target.marketplace",
      "Live marketplace is not the selected provider owner",
      `${projection.provider}/${projection.adapterProtocol}/${owner}`,
      `${inventory.marketplace.state.provider}/${inventory.marketplace.state.adapterProtocol}/${inventory.marketplace.state.marketplaceIdentity}`,
    ));
  }
  if (inventory.marketplace.kind === "absent" && inventory.members.length > 0) {
    issues.push(issue(
      "BLOCKED_COLLISION",
      "target.marketplace",
      "Embedded member provenance cannot establish ownership without the native marketplace",
      owner,
      "absent",
    ));
  }

  for (const live of inventory.members) {
    if (!strictlyOwned(live, projection)) {
      issues.push(issue(
        "BLOCKED_COLLISION",
        `target.members.${live.pluginId}`,
        "Native marketplace member does not carry exact selected-owner provenance",
        owner,
        `${live.providerSourceIdentity}/${live.artifactAuthority.contentAuthority}`,
      ));
    }
  }
  for (const [index, left] of inventory.members.entries()) {
    const duplicate = inventory.members.slice(index + 1).find((right) =>
      right.pluginId === left.pluginId || right.nativeIdentity === left.nativeIdentity);
    if (duplicate !== undefined) {
      issues.push(issue(
        "BLOCKED_COLLISION",
        `target.members.${left.pluginId}`,
        "Managed native inventory contains duplicate plugin or native identities",
        left.nativeIdentity,
        duplicate.nativeIdentity,
      ));
    }
  }
  for (const exposure of inventory.standaloneExposures) {
    if (exposure.providerSourceIdentity === owner) {
      issues.push(issue(
        "BLOCKED_COLLISION",
        "target.standaloneExposures",
        "Selected-owner state exists outside the native marketplace",
        "marketplace member",
        exposure.exposureIdentity,
      ));
      continue;
    }
    const desired = projection.members.find((member) =>
      standaloneConflictsWithProjection(exposure, member));
    if (desired !== undefined) {
      issues.push(issue(
        "BLOCKED_COLLISION",
        `target.standaloneExposures.${desired.pluginId}`,
        "Unmanaged native state conflicts with a selected plugin, skill, or hook",
        desired.nativeIdentity,
        exposure.exposureIdentity,
      ));
    }
  }
  return Object.freeze(issues);
}

function registrationFor(projection: AgentProviderProjection): ProviderMarketplaceRegistration {
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

function strictlyOwned(
  live: NativeMemberObservation,
  projection: AgentProviderProjection,
): boolean {
  return live.providerSourceIdentity === projection.marketplace.identity
    && live.artifactAuthority.protocol === projection.artifactAuthority.protocol
    && live.artifactAuthority.contentAuthority === projection.marketplace.identity;
}

function sameProjectedMember(
  live: NativeMemberObservation,
  desired: ProviderProjectionMember,
): boolean {
  return live.pluginId === desired.pluginId
    && live.nativeIdentity === desired.nativeIdentity
    && live.providerSourceIdentity === desired.providerSourceIdentity
    && sameArtifactAuthority(live.artifactAuthority, desired.artifactAuthority)
    && live.memberFingerprint === desired.memberFingerprint;
}

function sameArtifactAuthority(
  left: ProviderProjectionMember["artifactAuthority"],
  right: ProviderProjectionMember["artifactAuthority"],
): boolean {
  return left.protocol === right.protocol
    && left.contentAuthority === right.contentAuthority
    && left.sourceCommit === right.sourceCommit;
}

function sameVisibility(
  live: NativeMemberObservation,
  desired: ProviderProjectionMember,
): boolean {
  return sameNames(live.visibleSkills, desired.visible.skills)
    && sameNames(live.visibleHooks, desired.visible.hooks);
}

function sameNames(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function standaloneConflictsWithProjection(
  exposure: NativeStandaloneExposureObservation,
  desired: ProviderProjectionMember,
): boolean {
  return exposure.nativeIdentity === desired.nativeIdentity
    || exposure.nativeIdentity === desired.visible.pluginIdentity
    || namesOverlap(exposure.visibleSkills, desired.visible.skills)
    || namesOverlap(exposure.visibleHooks, desired.visible.hooks);
}

function namesOverlap(left: readonly string[], right: readonly string[]): boolean {
  const names = new Set(left);
  return right.some((name) => names.has(name));
}

function blocked(
  status: Exclude<CanonicalNativeConvergenceStatus, "CONVERGED" | "DRIFTED">,
  target: ProviderTarget,
  projection: AgentProviderProjection,
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>,
): CanonicalConvergencePlan {
  return Object.freeze({
    status,
    target,
    projection,
    steps: EMPTY_STEPS,
    issues: freezeNonEmpty(issues),
  });
}

function freezeNonEmpty<T>(
  items: NonEmptyReadonlyArray<T>,
): NonEmptyReadonlyArray<T> {
  return Object.freeze(items);
}

function compareNativeMembers(
  left: NativeMemberObservation,
  right: NativeMemberObservation,
): number {
  return compareCanonical(left.pluginId, right.pluginId)
    || compareCanonical(left.nativeIdentity, right.nativeIdentity);
}

function compareProjectedMembers(
  left: ProviderProjectionMember,
  right: ProviderProjectionMember,
): number {
  return compareCanonical(left.pluginId, right.pluginId)
    || compareCanonical(left.nativeIdentity, right.nativeIdentity);
}
