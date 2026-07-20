import type { MechanicalEvidenceDigest } from "./mechanical-evidence";
import type {
  CanonicalNativeMutationAction,
} from "./canonical-convergence";
import type {
  NativeProviderMutationAction,
  ProviderMutationAction,
  ProviderTargetPlan,
} from "../policy/state-machine";
import type {
  NonEmptyReadonlyArray,
  ProviderDeploymentIssue,
} from "../errors/deployment-result";
import type { ProviderTarget } from "./provider-target";

export type ProviderEvent =
  | Readonly<{ phase: "planned"; target: ProviderTarget; plan: ProviderTargetPlan }>
  | Readonly<{ phase: "applied"; target: ProviderTarget; action: ProviderMutationAction }>
  | Readonly<{ phase: "uncertain"; target: ProviderTarget; action: NativeProviderMutationAction; lastKnown: "bridge-invoked" | "bridge-returned"; issues: NonEmptyReadonlyArray<ProviderDeploymentIssue> }>
  | Readonly<{ phase: "verified"; target: ProviderTarget; visibleFingerprint: string }>
  | Readonly<{ phase: "retired"; target: ProviderTarget; action: Extract<ProviderMutationAction, { kind: "RetireMember" }> }>
  | Readonly<{ phase: "skipped"; target: ProviderTarget; reason: "read-only-converged" }>
  | Readonly<{ phase: "blocked"; target: ProviderTarget; issues: readonly ProviderDeploymentIssue[] }>
  | Readonly<{ phase: "failed"; target: ProviderTarget; issues: readonly ProviderDeploymentIssue[] }>;

export interface TargetOperationOutcome {
  readonly target: ProviderTarget;
  readonly status: "blocked" | "failed" | "mutated" | "read-only-converged";
  readonly events: readonly ProviderEvent[];
  readonly issues: readonly ProviderDeploymentIssue[];
  readonly visibleFingerprint: string | null;
}

export interface ProviderOperationOutcome {
  readonly status: "Blocked" | "Failed" | "Mutated" | "PartialFailure" | "ReadOnlyConverged";
  readonly targets: readonly TargetOperationOutcome[];
  readonly evidence: MechanicalEvidenceDigest | null;
  readonly issues: readonly ProviderDeploymentIssue[];
}

export type CanonicalTargetStatus =
  | "BLOCKED_SELECTION"
  | "CONVERGED"
  | "DRIFTED"
  | "BLOCKED_COLLISION"
  | "INCOMPATIBLE_PROVIDER";

export interface CanonicalStatusOutcome {
  readonly target: ProviderTarget;
  readonly status: CanonicalTargetStatus;
  readonly issues: readonly ProviderDeploymentIssue[];
}

export type CanonicalMutationRecord =
  | Readonly<{
    kind: "SetMarketplace";
    target: ProviderTarget;
    marketplaceIdentity: string;
    projectionDigest: string;
    sourceDigest: string;
  }>
  | Readonly<{
    kind: "InstallMember" | "EnableMember" | "RetireMember";
    target: ProviderTarget;
    marketplaceIdentity: string;
    pluginId: string;
    nativeIdentity: string;
    memberFingerprint: string;
  }>
  | Readonly<{
    kind: "RetireConfiguredExposure";
    target: ProviderTarget;
    marketplaceIdentity: string;
    exposureIdentity: string;
    nativeIdentity: string;
    providerSourceIdentity: string;
  }>;

interface CanonicalSyncTargetBase {
  readonly target: ProviderTarget;
}

export type CanonicalSyncTargetOutcome =
  | Readonly<CanonicalSyncTargetBase & {
    kind: "blocked";
    status: "BLOCKED_SELECTION" | "BLOCKED_COLLISION" | "INCOMPATIBLE_PROVIDER";
    appliedPrefix: readonly [];
    issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
  }>
  | Readonly<CanonicalSyncTargetBase & {
    kind: "read-only-converged";
    status: "CONVERGED";
    appliedPrefix: readonly [];
    issues: readonly [];
  }>
  | Readonly<CanonicalSyncTargetBase & {
    kind: "mutated";
    status: "CONVERGED";
    appliedPrefix: NonEmptyReadonlyArray<CanonicalMutationRecord>;
    issues: readonly [];
  }>
  | Readonly<CanonicalSyncTargetBase & {
    kind: "failed";
    status: "DRIFTED";
    appliedPrefix: readonly CanonicalMutationRecord[];
    issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
  }>
  | Readonly<CanonicalSyncTargetBase & {
    kind: "uncertain";
    status: "DRIFTED";
    appliedPrefix: readonly CanonicalMutationRecord[];
    attempted: CanonicalMutationRecord;
    lastKnown: "bridge-invoked" | "bridge-returned";
    issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
  }>;

export interface CanonicalSyncOutcome {
  readonly status:
    | "Blocked"
    | "Failed"
    | "Mutated"
    | "PartialFailure"
    | "ReadOnlyConverged";
  readonly targets: readonly CanonicalSyncTargetOutcome[];
  readonly issues: readonly ProviderDeploymentIssue[];
}

export function canonicalMutationRecord(
  action: CanonicalNativeMutationAction,
): CanonicalMutationRecord {
  if (action.kind === "SetMarketplace") {
    return Object.freeze({
      kind: action.kind,
      target: action.target,
      marketplaceIdentity: action.registration.marketplaceIdentity,
      projectionDigest: action.registration.projectionDigest,
      sourceDigest: action.registration.sourceDigest,
    });
  }
  if (action.kind === "RetireConfiguredExposure") {
    return Object.freeze({
      kind: action.kind,
      target: action.target,
      marketplaceIdentity: action.activeMarketplace.marketplaceIdentity,
      exposureIdentity: action.exposure.exposureIdentity,
      nativeIdentity: action.exposure.nativeIdentity,
      providerSourceIdentity: action.exposure.providerSourceIdentity,
    });
  }
  const member = action.member;
  return Object.freeze({
    kind: action.kind,
    target: action.target,
    marketplaceIdentity: action.activeMarketplace.marketplaceIdentity,
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    memberFingerprint: member.memberFingerprint,
  });
}
