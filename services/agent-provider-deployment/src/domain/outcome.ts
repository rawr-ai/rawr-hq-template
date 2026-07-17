import type { MechanicalEvidenceDigest } from "./evidence";
import type { ProviderMutationAction, ProviderTargetPlan } from "./state";
import type { ProviderDeploymentIssue } from "./result";
import type { ProviderTarget } from "./target";

export type ProviderEvent =
  | Readonly<{ phase: "planned"; target: ProviderTarget; plan: ProviderTargetPlan }>
  | Readonly<{ phase: "applied"; target: ProviderTarget; action: ProviderMutationAction }>
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
  | "CONTENT_AHEAD_OF_ACCEPTANCE"
  | "ACCEPTED_PENDING_CONVERGENCE"
  | "CONVERGED"
  | "DRIFTED"
  | "BLOCKED_COLLISION"
  | "INCOMPATIBLE_PROVIDER";

export interface CanonicalStatusOutcome {
  readonly target: ProviderTarget;
  readonly status: CanonicalTargetStatus;
  readonly issues: readonly ProviderDeploymentIssue[];
}
