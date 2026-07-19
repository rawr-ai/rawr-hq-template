import type { PluginId } from "../../../../shared/release";

import { canonicalDigest, compareCanonical, type CanonicalValue } from "../helpers/canonical";
import {
  createProviderMarketplaceRegistration,
  marketplaceObservationValue,
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "./marketplace";
import { targetRequestDigest, type ProviderRequestDigest, type TargetedTest, type CompleteTest } from "../dto/mode";
import type {
  AgentProviderProjection,
  CapabilityEvaluation,
  ProviderArtifactAuthority,
  ProviderMemberFingerprint,
  ProjectionDigest,
  ProviderProjectionMember,
  ProviderSourceIdentity,
} from "./projection";
import {
  createTargetReceipt,
  receiptScopeValue,
  visibleFingerprint,
  type CompleteTestScope,
  type ManagedMemberClaim,
  type TargetReceipt,
  type TargetReceiptScope,
  type TargetedTestScope,
  type VerifiedMemberIdentity,
} from "./receipt";
import { issue, type ProviderDeploymentIssue } from "../errors/deployment-result";
import type { ProviderTarget, ProviderTargetDigest } from "../dto/provider-target";

declare const inventoryFingerprintBrand: unique symbol;
declare const targetIdentityDigestBrand: unique symbol;

export type InventoryFingerprint = string & { readonly [inventoryFingerprintBrand]: "InventoryFingerprint" };
export type TargetIdentityDigest = string & { readonly [targetIdentityDigestBrand]: "TargetIdentityDigest" };

export interface NativeMemberObservation {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly enablement: "disabled" | "enabled";
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

interface NativeStandaloneExposureObservationBase {
  readonly exposureIdentity: string;
  readonly nativeIdentity: string;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly enablement: "disabled" | "enabled";
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export interface NativeConfiguredExposureObservation extends NativeStandaloneExposureObservationBase {
  readonly exposureKind: "configured-only";
}

export interface NativeInstalledExposureObservation extends NativeStandaloneExposureObservationBase {
  readonly exposureKind: "installed";
}

export type NativeStandaloneExposureObservation =
  | NativeConfiguredExposureObservation
  | NativeInstalledExposureObservation;

export interface ProviderInventory {
  readonly target: ProviderTarget;
  readonly marketplace: ProviderMarketplaceObservation;
  readonly members: readonly NativeMemberObservation[];
  readonly standaloneExposures: readonly NativeStandaloneExposureObservation[];
  readonly inventoryFingerprint: InventoryFingerprint;
}

export interface TargetIdentitySidecar {
  readonly schemaVersion: 1;
  readonly provider: ProviderTarget["provider"];
  readonly canonicalHome: ProviderTarget["home"];
  readonly targetDigest: ProviderTargetDigest;
  readonly identityDigest: TargetIdentityDigest;
}

export type TargetIdentityObservation =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "present"; sidecar: TargetIdentitySidecar }>;

export type ReceiptObservation =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "present"; receipt: TargetReceipt }>;

export type ProviderMutationAction =
  | Readonly<{ kind: "AdmitTargetIdentity"; target: ProviderTarget; sidecar: TargetIdentitySidecar }>
  | Readonly<{ kind: "SetMarketplace"; role: "transition" | "final"; target: ProviderTarget; expected: ProviderMarketplaceObservation; registration: ProviderMarketplaceRegistration | null }>
  | Readonly<{ kind: "InstallMember"; target: ProviderTarget; activeMarketplace: ProviderMarketplaceRegistration | null; member: ProviderProjectionMember }>
  | Readonly<{ kind: "EnableMember"; target: ProviderTarget; activeMarketplace: ProviderMarketplaceRegistration | null; member: ProviderProjectionMember }>
  | Readonly<{ kind: "RetireMember"; target: ProviderTarget; activeMarketplace: ProviderMarketplaceRegistration | null; member: NativeMemberObservation }>
  | Readonly<{ kind: "PublishReceipt"; target: ProviderTarget; prior: ReceiptObservation; receipt: TargetReceipt }>;

export type NativeProviderMutationAction = Extract<
  ProviderMutationAction,
  { kind: "EnableMember" | "InstallMember" | "RetireMember" | "SetMarketplace" }
>;

export type ProviderPlanStep =
  | Readonly<{ kind: "mutate"; action: ProviderMutationAction }>
  | Readonly<{ kind: "verify"; target: ProviderTarget; projection: AgentProviderProjection }>
  | Readonly<{ kind: "verify-managed"; target: ProviderTarget; claims: readonly ManagedMemberClaim[]; marketplace: ProviderMarketplaceRegistration | null }>
  | Readonly<{ kind: "verify-retired"; target: ProviderTarget; nativeIdentity: string }>;

export interface ProviderTargetPlan {
  readonly target: ProviderTarget;
  readonly state: "blocked" | "mutating" | "read-only";
  readonly projection: AgentProviderProjection | null;
  readonly steps: readonly ProviderPlanStep[];
  readonly issues: readonly ProviderDeploymentIssue[];
}

export type DeploymentAuthority =
  | Readonly<{ kind: "targeted-test"; request: TargetedTest; projection: AgentProviderProjection }>
  | Readonly<{ kind: "complete-test"; request: CompleteTest; projection: AgentProviderProjection }>;

export interface PlanTargetInput {
  readonly authority: DeploymentAuthority;
  readonly inventory: ProviderInventory;
  readonly receipt: ReceiptObservation;
  readonly targetIdentity: TargetIdentityObservation;
  readonly capabilities: CapabilityEvaluation;
}

export function createProviderInventory(
  target: ProviderTarget,
  members: readonly NativeMemberObservation[],
  standaloneExposures: readonly NativeStandaloneExposureObservation[] = [],
  marketplace: ProviderMarketplaceObservation = Object.freeze({ kind: "absent" }),
): ProviderInventory {
  const sorted = [...members].sort(compareNativeMembers);
  const sortedExposures = [...standaloneExposures].sort(compareStandaloneExposures);
  return Object.freeze({
    target,
    marketplace,
    members: Object.freeze(sorted),
    standaloneExposures: Object.freeze(sortedExposures),
    inventoryFingerprint: canonicalDigest("pi1_", {
      targetDigest: target.targetDigest,
      marketplace: marketplaceObservationValue(marketplace),
      members: sorted.map(nativeMemberValue),
      standaloneExposures: sortedExposures.map(standaloneExposureValue),
    }) as InventoryFingerprint,
  });
}

export function createTargetIdentitySidecar(target: ProviderTarget): TargetIdentitySidecar {
  const body = {
    schemaVersion: 1,
    provider: target.provider,
    canonicalHome: target.home,
    targetDigest: target.targetDigest,
  } as const;
  return Object.freeze({
    ...body,
    identityDigest: canonicalDigest("ti1_", body) as TargetIdentityDigest,
  });
}

export function hasProjectionExposureCollision(
  inventory: ProviderInventory,
  projection: AgentProviderProjection,
): boolean {
  for (const desired of projection.members) {
    const members = inventory.members.filter((live) => memberConflictsWithProjection(live, desired));
    if (members.length > 0 && (
      members.length !== 1
      || !memberHasProjectedIdentity(members[0]!, desired)
    )) {
      return true;
    }
    if (inventory.standaloneExposures.some((exposure) => standaloneConflictsWithProjection(exposure, desired))) {
      return true;
    }
  }
  return false;
}

export function hasProjectionCollision(
  target: ProviderTarget,
  inventory: ProviderInventory,
  projection: AgentProviderProjection,
  receipt: ReceiptObservation,
): boolean {
  if (hasProjectionExposureCollision(inventory, projection)) return true;
  const claims = new Map(receipt.kind === "present"
    && receipt.receipt.body.provider === target.provider
    && receipt.receipt.body.targetDigest === target.targetDigest
    ? receipt.receipt.body.managedMembers.map((claim) => [claim.pluginId, claim])
    : []);
  return projection.members.some((desired) => {
    const live = inventory.members.find((candidate) => memberHasProjectedIdentity(candidate, desired));
    return live !== undefined
      && !projectionOwnsLiveMember(live, desired)
      && !receiptOwnsLiveMember(live, claims.get(desired.pluginId));
  });
}

export function planTarget(input: PlanTargetInput): ProviderTargetPlan {
  const { authority, inventory, receipt, targetIdentity } = input;
  const target = inventory.target;
  const issues: ProviderDeploymentIssue[] = [];
  if (!input.capabilities.compatible) {
    issues.push(issue("CAPABILITY_MISMATCH", "target.capabilities", "Provider does not satisfy the projection capability profile", input.capabilities.missing.join(","), "missing"));
  }
  if (receipt.kind === "present" && (
    receipt.receipt.body.provider !== target.provider
    || receipt.receipt.body.targetDigest !== target.targetDigest
  )) {
    issues.push(issue("RECEIPT_TARGET_MISMATCH", "target.receipt", "Receipt belongs to another provider home", target.targetDigest, receipt.receipt.body.targetDigest));
  }
  if (authority.projection.provider !== target.provider) {
    issues.push(issue("PROJECTION_MISMATCH", "target.projection.provider", "Projection provider does not match target", target.provider, authority.projection.provider));
  }

  const currentReceipt = receipt.kind === "present" ? receipt.receipt : undefined;
  const desired = authority.projection.members;
  const receiptClaims = new Map((currentReceipt?.body.managedMembers ?? []).map((member) => [member.pluginId, member]));
  const projectionIssue = projectionAuthorityIssue(authority.projection);
  if (projectionIssue !== undefined) issues.push(projectionIssue);
  const receiptIssue = currentReceipt === undefined
    ? undefined
    : receiptWitnessIssue(target, authority.projection, currentReceipt);
  if (receiptIssue !== undefined) issues.push(receiptIssue);

  const hasCollision = hasProjectionCollision(target, inventory, authority.projection, receipt);
  if (hasCollision) {
    issues.push(issue(
      "BLOCKED_COLLISION",
      "target.inventory",
      "A native plugin, provider source, standalone skill, or hook conflicts with the desired projection",
    ));
  }
  if (issues.length > 0) return blockedPlan(target, authority.projection, issues);

  const reconciledClaims = nextManagedClaims(
    desired,
    authority.projection.projectionDigest,
    currentReceipt,
    inventory,
  );
  if (reconciledClaims.issues.length > 0) {
    return blockedPlan(target, authority.projection, reconciledClaims.issues);
  }
  const expectedClaims = reconciledClaims.claims;
  const transitionClaims = expectedClaims;
  const transitionVerificationClaims = expectedClaims;
  let nextMarketplace: ProviderMarketplaceRegistration;
  let transitionMarketplace: ProviderMarketplaceRegistration;
  let currentMarketplace: ProviderMarketplaceRegistration | null;
  try {
    nextMarketplace = registrationForClaims(authority, expectedClaims);
    transitionMarketplace = registrationForClaims(authority, transitionClaims);
    currentMarketplace = currentReceipt === undefined
      ? null
      : receiptMarketplaceRegistration(currentReceipt);
  } catch (error) {
    return blockedPlan(target, authority.projection, [issue(
      "PROJECTION_MISMATCH",
      "target.marketplace",
      error instanceof Error ? error.message : String(error),
    )]);
  }

  const marketplacePhase = classifyForwardMarketplace(
    inventory.marketplace,
    currentMarketplace,
    transitionMarketplace,
    nextMarketplace,
  );
  if (marketplacePhase.kind === "blocked") {
    return blockedPlan(target, authority.projection, [marketplacePhase.issue]);
  }
  const phaseClaims = marketplacePhase.phase === "final"
    ? expectedClaims
    : marketplacePhase.phase === "transition"
      ? transitionClaims
      : currentReceipt?.body.managedMembers ?? Object.freeze([]);
  const nativeStateIssue = forwardNativeStateIssue(
    inventory,
    authority.projection,
    phaseClaims,
  );
  if (nativeStateIssue !== undefined) {
    return blockedPlan(target, authority.projection, [nativeStateIssue]);
  }

  const hasTransition = !sameMarketplaceState(transitionMarketplace, nextMarketplace);
  const activeMemberMarketplace = marketplacePhase.phase === "final"
    ? nextMarketplace
    : hasTransition
      ? transitionMarketplace
      : nextMarketplace;
  const currentActiveMarketplace = marketplacePhase.phase === "initial"
    ? null
    : marketplacePhase.phase === "prior"
      ? currentMarketplace
      : marketplacePhase.phase === "transition"
        ? transitionMarketplace
        : nextMarketplace;
  const beforeMarketplaceActions: ProviderMutationAction[] = [];
  const afterMarketplaceActions: ProviderMutationAction[] = [];

  for (const member of desired) {
    const live = inventory.members.find((candidate) => candidate.nativeIdentity === member.nativeIdentity);
    if (live === undefined) {
      afterMarketplaceActions.push(Object.freeze({
        kind: "InstallMember",
        target,
        activeMarketplace: activeMemberMarketplace,
        member,
      }));
      continue;
    }
    const claim = receiptClaims.get(member.pluginId);
    const desiredOwned = projectionOwnsLiveMember(live, member);
    const priorOwned = receiptOwnsLiveMember(live, claim);
    if (live.pluginId !== member.pluginId || (!desiredOwned && !priorOwned)) {
      issues.push(issue("BLOCKED_COLLISION", `target.members.${member.pluginId}`, "An unmanaged or differently owned native identity blocks deployment", member.nativeIdentity, live.nativeIdentity));
      continue;
    }
    if (live.memberFingerprint !== member.memberFingerprint) {
      beforeMarketplaceActions.push(Object.freeze({
        kind: "RetireMember",
        target,
        activeMarketplace: currentActiveMarketplace,
        member: live,
      }));
      afterMarketplaceActions.push(Object.freeze({
        kind: "InstallMember",
        target,
        activeMarketplace: activeMemberMarketplace,
        member,
      }));
      continue;
    }
    if (live.enablement !== "enabled") {
      afterMarketplaceActions.push(Object.freeze({
        kind: "EnableMember",
        target,
        activeMarketplace: activeMemberMarketplace,
        member,
      }));
    }
  }

  if (issues.length > 0) return blockedPlan(target, authority.projection, issues);

  const retireActions: readonly ProviderMutationAction[] = Object.freeze([]);
  const hasNativeMutation = beforeMarketplaceActions.length > 0
    || afterMarketplaceActions.length > 0
    || retireActions.length > 0;
  let transitionMarketplaceAction: Extract<ProviderMutationAction, { kind: "SetMarketplace" }> | null;
  let finalMarketplaceAction: Extract<ProviderMutationAction, { kind: "SetMarketplace" }> | null;
  try {
    transitionMarketplaceAction = marketplacePhase.phase === "final"
      || marketplacePhase.phase === "transition"
      ? null
      : marketplaceMutation(
          target,
          hasTransition ? "transition" : "final",
          inventory.marketplace,
          hasTransition ? transitionMarketplace : nextMarketplace,
        );
    finalMarketplaceAction = !hasTransition || marketplacePhase.phase === "final"
      ? null
      : marketplaceMutation(
          target,
          "final",
          Object.freeze({ kind: "present", state: marketplaceState(transitionMarketplace) }),
          nextMarketplace,
        );
  } catch (error) {
    return blockedPlan(target, authority.projection, [issue(
      "INVALID_RECEIPT",
      "target.receipt.marketplace",
      error instanceof Error ? error.message : String(error),
    )]);
  }
  if (hasTransition && marketplacePhase.phase !== "final" && finalMarketplaceAction === null) {
    return blockedPlan(target, authority.projection, [issue(
      "PROJECTION_MISMATCH",
      "target.marketplace",
      "Forward transition must converge to a distinct final marketplace",
    )]);
  }
  const hasTargetMutation = hasNativeMutation
    || transitionMarketplaceAction !== null
    || finalMarketplaceAction !== null;
  const nextReceipt = createReceipt(
    authority,
    target,
    currentReceipt,
    expectedClaims,
    marketplaceState(nextMarketplace),
    hasTargetMutation,
  );
  const receiptMatches = currentReceipt?.receiptDigest === nextReceipt.receiptDigest;
  const shouldPublish = hasTargetMutation || currentReceipt === undefined || !receiptMatches;

  if (!hasTargetMutation && !shouldPublish && targetIdentity.kind === "present") {
    return Object.freeze({
      target,
      state: "read-only",
      projection: authority.projection,
      steps: Object.freeze([
        { kind: "verify" as const, target, projection: authority.projection },
        { kind: "verify-managed" as const, target, claims: expectedClaims, marketplace: nextMarketplace },
      ]),
      issues: Object.freeze([]),
    });
  }

  const steps: ProviderPlanStep[] = [];
  if (targetIdentity.kind === "absent") {
    steps.push(Object.freeze({
      kind: "mutate",
      action: Object.freeze({ kind: "AdmitTargetIdentity", target, sidecar: createTargetIdentitySidecar(target) }),
    }));
  }
  for (const action of beforeMarketplaceActions) {
    steps.push(Object.freeze({ kind: "mutate", action }));
    if (action.kind === "RetireMember") {
      steps.push(Object.freeze({ kind: "verify-retired", target, nativeIdentity: action.member.nativeIdentity }));
    }
  }
  if (transitionMarketplaceAction !== null) {
    steps.push(Object.freeze({ kind: "mutate", action: transitionMarketplaceAction }));
  }
  for (const action of afterMarketplaceActions) {
    steps.push(Object.freeze({ kind: "mutate", action }));
  }
  steps.push(Object.freeze({ kind: "verify", target, projection: authority.projection }));
  if (hasTransition && marketplacePhase.phase !== "final") {
    steps.push(Object.freeze({
      kind: "verify-managed",
      target,
      claims: transitionVerificationClaims,
      marketplace: transitionMarketplace,
    }));
  }
  for (const action of retireActions) {
    steps.push(Object.freeze({ kind: "mutate", action }));
    if (action.kind === "RetireMember") {
      steps.push(Object.freeze({ kind: "verify-retired", target, nativeIdentity: action.member.nativeIdentity }));
    }
  }
  if (finalMarketplaceAction !== null) {
    steps.push(Object.freeze({ kind: "mutate", action: finalMarketplaceAction }));
    steps.push(Object.freeze({ kind: "verify", target, projection: authority.projection }));
  }
  steps.push(Object.freeze({ kind: "verify-managed", target, claims: expectedClaims, marketplace: nextMarketplace }));
  if (shouldPublish) {
    steps.push(Object.freeze({ kind: "mutate", action: Object.freeze({ kind: "PublishReceipt", target, prior: receipt, receipt: nextReceipt }) }));
  }
  return Object.freeze({ target, state: "mutating", projection: authority.projection, steps: Object.freeze(steps), issues: Object.freeze([]) });
}

export function nativeMemberValue(member: NativeMemberObservation): CanonicalValue {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: artifactAuthorityValue(member.artifactAuthority),
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement: member.enablement,
    visibleSkills: [...member.visibleSkills].sort(compareCanonical),
    visibleHooks: [...member.visibleHooks].sort(compareCanonical),
  };
}

export function standaloneExposureValue(exposure: NativeStandaloneExposureObservation): CanonicalValue {
  return {
    exposureKind: exposure.exposureKind,
    exposureIdentity: exposure.exposureIdentity,
    nativeIdentity: exposure.nativeIdentity,
    providerSourceIdentity: exposure.providerSourceIdentity,
    enablement: exposure.enablement,
    visibleSkills: [...exposure.visibleSkills].sort(compareCanonical),
    visibleHooks: [...exposure.visibleHooks].sort(compareCanonical),
  };
}

function createReceipt(
  authority: DeploymentAuthority,
  target: ProviderTarget,
  prior: TargetReceipt | undefined,
  managedMembers: readonly ManagedMemberClaim[],
  marketplace: ReturnType<typeof marketplaceState>,
  forceSuccessor: boolean,
): TargetReceipt {
  const verifiedMembers = authority.projection.members.map(toVerifiedMember);
  const common = {
    requestDigest: targetRequestDigest(authority.request, target),
    projectionDigest: authority.projection.projectionDigest,
    adapterProtocol: authority.projection.adapterProtocol,
    capabilityProfileDigest: authority.projection.capabilityProfile.capabilityProfileDigest,
    visibleFingerprint: visibleFingerprint(verifiedMembers),
    verifiedMembers,
  } as const;
  const scope = createScope(authority, common);
  if (!forceSuccessor && prior !== undefined && receiptSemanticsMatch(prior, marketplace, scope, managedMembers)) return prior;
  return createTargetReceipt({
    schemaVersion: 1,
    provider: target.provider,
    targetDigest: target.targetDigest,
    generation: (prior?.body.generation ?? 0) + 1,
    lineage: prior === undefined ? { kind: "initial" } : { kind: "successor", priorReceiptDigest: prior.receiptDigest },
    marketplace,
    scope,
    managedMembers,
  });
}

function createScope(
  authority: DeploymentAuthority,
  common: Pick<TargetReceiptScope, "adapterProtocol" | "capabilityProfileDigest" | "projectionDigest" | "requestDigest" | "verifiedMembers" | "visibleFingerprint">,
): TargetReceiptScope {
  switch (authority.kind) {
    case "targeted-test":
      return Object.freeze({ kind: authority.kind, ...common, releases: authority.request.releases, evaluationProfile: authority.request.evaluationProfile } satisfies TargetedTestScope);
    case "complete-test":
      return Object.freeze({ kind: authority.kind, ...common, releaseSet: authority.request.releaseSet, evaluationProfile: authority.request.evaluationProfile } satisfies CompleteTestScope);
  }
}

function registrationForClaims(
  authority: DeploymentAuthority,
  claims: readonly ManagedMemberClaim[],
): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: authority.projection.provider,
    adapterProtocol: authority.projection.adapterProtocol,
    marketplaceIdentity: authority.projection.marketplace.identity,
    members: claims.map((claim) => ({
      pluginId: claim.pluginId,
      nativeIdentity: claim.nativeIdentity,
      providerSourceIdentity: claim.providerSourceIdentity,
      sourceProjectionDigest: claim.sourceProjectionDigest,
      memberFingerprint: claim.memberFingerprint,
    })),
  });
}

function marketplaceMutation(
  target: ProviderTarget,
  role: Extract<ProviderMutationAction, { kind: "SetMarketplace" }>["role"],
  expected: ProviderMarketplaceObservation,
  registration: ProviderMarketplaceRegistration | null,
): Extract<ProviderMutationAction, { kind: "SetMarketplace" }> | null {
  if (registration === null) {
    return expected.kind === "absent"
      ? null
      : Object.freeze({ kind: "SetMarketplace", role, target, expected, registration });
  }
  if (expected.kind === "present" && sameMarketplaceState(expected.state, registration)) return null;
  return Object.freeze({ kind: "SetMarketplace", role, target, expected, registration });
}

function receiptMarketplaceRegistration(
  receipt: TargetReceipt,
): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: receipt.body.provider,
    adapterProtocol: receipt.body.scope.adapterProtocol,
    marketplaceIdentity: receipt.body.marketplace.marketplaceIdentity,
    members: receipt.body.managedMembers.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: member.sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function projectionAuthorityIssue(
  projection: AgentProviderProjection,
): ProviderDeploymentIssue | undefined {
  const owner = projection.marketplace.identity;
  if (
    projection.artifactAuthority.contentAuthority !== owner
    || projection.members.some((member) =>
      member.providerSourceIdentity !== owner
      || member.artifactAuthority.contentAuthority !== owner)
  ) {
    return issue(
      "PROJECTION_MISMATCH",
      "target.projection.authority",
      "Projection marketplace, source, and artifact authorities must bind one content owner",
      owner,
      "mixed authority",
    );
  }
  return undefined;
}

function receiptWitnessIssue(
  target: ProviderTarget,
  projection: AgentProviderProjection,
  receipt: TargetReceipt,
): ProviderDeploymentIssue | undefined {
  const owner = projection.marketplace.identity;
  if (
    receipt.body.provider !== target.provider
    || receipt.body.targetDigest !== target.targetDigest
    || receipt.body.scope.adapterProtocol !== projection.adapterProtocol
    || receipt.body.marketplace.marketplaceIdentity !== owner
    || receipt.body.managedMembers.some((claim) =>
      claim.providerSourceIdentity !== owner
      || claim.artifactAuthority.contentAuthority !== owner)
    || receipt.body.scope.verifiedMembers.some((member) =>
      member.providerSourceIdentity !== owner
      || member.artifactAuthority.contentAuthority !== owner)
  ) {
    return issue(
      "INVALID_RECEIPT",
      "target.receipt.authority",
      "Receipt provenance does not bind the selected target and content owner",
      owner,
      receipt.body.marketplace.marketplaceIdentity,
    );
  }
  try {
    const registration = receiptMarketplaceRegistration(receipt);
    if (!sameMarketplaceState(registration, receipt.body.marketplace)) {
      return issue(
        "INVALID_RECEIPT",
        "target.receipt.marketplace",
        "Receipt marketplace state does not match its managed member claims",
        registration.projectionDigest,
        receipt.body.marketplace.projectionDigest,
      );
    }
  } catch (error) {
    return issue(
      "INVALID_RECEIPT",
      "target.receipt.marketplace",
      error instanceof Error ? error.message : String(error),
    );
  }
  return undefined;
}

type ForwardMarketplacePhase = "initial" | "prior" | "transition" | "final";

function classifyForwardMarketplace(
  live: ProviderMarketplaceObservation,
  prior: ProviderMarketplaceRegistration | null,
  transition: ProviderMarketplaceRegistration,
  final: ProviderMarketplaceRegistration,
): Readonly<
  | { kind: "accepted"; phase: ForwardMarketplacePhase }
  | { kind: "blocked"; issue: ProviderDeploymentIssue }
> {
  if (live.kind === "absent") {
    return Object.freeze({ kind: "accepted", phase: "initial" });
  }
  if (sameMarketplaceState(live.state, final)) {
    return Object.freeze({ kind: "accepted", phase: "final" });
  }
  if (sameMarketplaceState(live.state, transition)) {
    return Object.freeze({ kind: "accepted", phase: "transition" });
  }
  if (prior !== null && sameMarketplaceState(live.state, prior)) {
    return Object.freeze({ kind: "accepted", phase: "prior" });
  }
  return Object.freeze({
    kind: "blocked",
    issue: issue(
      "BLOCKED_COLLISION",
      "target.marketplace",
      "Live marketplace is not an exact prior, transition, or final registration for this request",
      final.projectionDigest,
      live.state.projectionDigest,
    ),
  });
}

function forwardNativeStateIssue(
  inventory: ProviderInventory,
  projection: AgentProviderProjection,
  phaseClaims: readonly ManagedMemberClaim[],
): ProviderDeploymentIssue | undefined {
  const owner = projection.marketplace.identity;
  const ownedStandalone = inventory.standaloneExposures.find((exposure) =>
    exposure.providerSourceIdentity === owner);
  if (ownedStandalone !== undefined) {
    return issue(
      "BLOCKED_COLLISION",
      "target.inventory.standaloneExposures",
      "Selected-owner standalone state is outside the lifecycle projection",
      "native marketplace member",
      ownedStandalone.exposureIdentity,
    );
  }
  const ownedMembers = inventory.members.filter((member) =>
    member.providerSourceIdentity === owner
    || member.artifactAuthority.contentAuthority === owner);
  for (const live of ownedMembers) {
    const related = ownedMembers.filter((candidate) =>
      candidate.pluginId === live.pluginId
      || candidate.nativeIdentity === live.nativeIdentity);
    if (related.length !== 1 || !phaseClaims.some((claim) => receiptOwnsLiveMember(live, claim))) {
      return issue(
        "BLOCKED_COLLISION",
        `target.members.${live.pluginId}`,
        "Selected-owner native state is duplicate, ambiguous, or outside the admitted forward phase",
        "exact phase member",
        live.nativeIdentity,
      );
    }
  }
  return undefined;
}

function nextManagedClaims(
  desired: readonly ProviderProjectionMember[],
  desiredProjectionDigest: ProjectionDigest,
  receipt: TargetReceipt | undefined,
  inventory: ProviderInventory,
): Readonly<{
  claims: readonly ManagedMemberClaim[];
  issues: readonly ProviderDeploymentIssue[];
}> {
  const desiredClaims = desired.map((member) => toManagedMember(member, desiredProjectionDigest));
  const preserved: ManagedMemberClaim[] = [];
  const issues: ProviderDeploymentIssue[] = [];
  for (const claim of receipt?.body.managedMembers ?? []) {
    if (desiredClaims.some((desiredClaim) => desiredClaim.pluginId === claim.pluginId)) continue;
    const related = inventory.members.filter((live) =>
      live.pluginId === claim.pluginId || live.nativeIdentity === claim.nativeIdentity);
    const standalone = inventory.standaloneExposures.some((exposure) =>
      exposure.nativeIdentity === claim.nativeIdentity);
    if (related.length === 0 && !standalone) continue;
    if (
      standalone
      || related.length !== 1
      || !receiptOwnsLiveMember(related[0]!, claim)
      || related[0]!.enablement !== "enabled"
    ) {
      issues.push(issue(
        "BLOCKED_COLLISION",
        `target.managedMembers.${claim.pluginId}`,
        "Preserved receipt-owned member is ambiguous or drifted",
        claim.memberFingerprint,
        related[0]?.memberFingerprint ?? (standalone ? "standalone exposure" : "absent"),
      ));
      continue;
    }
    preserved.push(claim);
  }
  return Object.freeze({
    claims: Object.freeze([...preserved, ...desiredClaims].sort(compareClaims)),
    issues: Object.freeze(issues),
  });
}

function receiptOwnsLiveMember(
  live: NativeMemberObservation,
  claim: ManagedMemberClaim | undefined,
): boolean {
  return receiptClaimsLiveIdentity(live, claim)
    && claim?.memberFingerprint === live.memberFingerprint;
}

function projectionOwnsLiveMember(
  live: NativeMemberObservation,
  desired: ProviderProjectionMember,
): boolean {
  return live.pluginId === desired.pluginId
    && live.nativeIdentity === desired.nativeIdentity
    && live.providerSourceIdentity === desired.providerSourceIdentity
    && sameArtifactAuthority(live.artifactAuthority, desired.artifactAuthority)
    && live.memberFingerprint === desired.memberFingerprint;
}

function receiptClaimsLiveIdentity(
  live: NativeMemberObservation,
  claim: ManagedMemberClaim | undefined,
): boolean {
  return claim !== undefined
    && claim.nativeIdentity === live.nativeIdentity
    && claim.pluginId === live.pluginId
    && claim.providerSourceIdentity === live.providerSourceIdentity
    && sameArtifactAuthority(claim.artifactAuthority, live.artifactAuthority);
}

function toVerifiedMember(member: ProviderProjectionMember): VerifiedMemberIdentity {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
  });
}

function toManagedMember(
  member: ProviderProjectionMember,
  sourceProjectionDigest: ProjectionDigest,
): ManagedMemberClaim {
  return Object.freeze({ ...toVerifiedMember(member), sourceProjectionDigest });
}

function blockedPlan(target: ProviderTarget, projection: AgentProviderProjection | null, issues: readonly ProviderDeploymentIssue[]): ProviderTargetPlan {
  return Object.freeze({ target, state: "blocked", projection, steps: Object.freeze([]), issues: Object.freeze([...issues]) });
}

function compareNativeMembers(left: NativeMemberObservation, right: NativeMemberObservation): number {
  return compareCanonical(left.pluginId, right.pluginId)
    || compareCanonical(left.nativeIdentity, right.nativeIdentity)
    || compareCanonical(left.providerSourceIdentity, right.providerSourceIdentity);
}

function compareStandaloneExposures(
  left: NativeStandaloneExposureObservation,
  right: NativeStandaloneExposureObservation,
): number {
  return compareCanonical(left.nativeIdentity, right.nativeIdentity)
    || compareCanonical(left.providerSourceIdentity, right.providerSourceIdentity)
    || compareCanonical(left.exposureIdentity, right.exposureIdentity);
}

function compareClaims(left: ManagedMemberClaim, right: ManagedMemberClaim): number {
  return compareCanonical(left.pluginId, right.pluginId) || compareCanonical(left.nativeIdentity, right.nativeIdentity);
}

function memberConflictsWithProjection(
  live: NativeMemberObservation,
  desired: ProviderProjectionMember,
): boolean {
  return live.pluginId === desired.pluginId
    || live.nativeIdentity === desired.nativeIdentity
    || live.nativeIdentity === desired.visible.pluginIdentity
    || namesOverlap(live.visibleSkills, desired.visible.skills)
    || namesOverlap(live.visibleHooks, desired.visible.hooks);
}

function memberHasProjectedIdentity(
  live: NativeMemberObservation,
  desired: ProviderProjectionMember,
): boolean {
  return live.pluginId === desired.pluginId
    && live.nativeIdentity === desired.nativeIdentity
    && live.providerSourceIdentity === desired.providerSourceIdentity;
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

function artifactAuthorityValue(authority: ProviderArtifactAuthority): CanonicalValue {
  return {
    protocol: authority.protocol,
    contentAuthority: authority.contentAuthority,
    sourceCommit: authority.sourceCommit,
  };
}

function sameArtifactAuthority(left: ProviderArtifactAuthority, right: ProviderArtifactAuthority): boolean {
  return left.protocol === right.protocol
    && left.contentAuthority === right.contentAuthority
    && left.sourceCommit === right.sourceCommit;
}

function projectedNativeMember(
  member: ProviderProjectionMember,
  enablement: NativeMemberObservation["enablement"],
): NativeMemberObservation {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement,
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  });
}

function receiptSemanticsMatch(
  prior: TargetReceipt,
  marketplace: ReturnType<typeof marketplaceState>,
  scope: TargetReceiptScope,
  managedMembers: readonly ManagedMemberClaim[],
): boolean {
  if (!sameMarketplaceState(prior.body.marketplace, marketplace)) return false;
  if (canonicalDigest("scope_", receiptScopeValue(prior.body.scope)) !== canonicalDigest("scope_", receiptScopeValue(scope))) {
    return false;
  }
  const priorMembers = [...prior.body.managedMembers].sort(compareClaims);
  const nextMembers = [...managedMembers].sort(compareClaims);
  if (priorMembers.length !== nextMembers.length) return false;
  return priorMembers.every((member, index) => {
    const next = nextMembers[index];
    return next !== undefined
      && member.pluginId === next.pluginId
      && member.nativeIdentity === next.nativeIdentity
      && member.providerSourceIdentity === next.providerSourceIdentity
      && sameArtifactAuthority(member.artifactAuthority, next.artifactAuthority)
      && member.memberFingerprint === next.memberFingerprint
      && member.sourceProjectionDigest === next.sourceProjectionDigest;
  });
}
