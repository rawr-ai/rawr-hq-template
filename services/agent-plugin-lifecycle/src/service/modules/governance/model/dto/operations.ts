import type {
  AcceptanceEvidence,
  AcceptanceRequest,
  LifecyclePolicy,
} from "./acceptance";
import type { ExactGitBlobPointer, GitLocator } from "./git";
import type { HostedApprovalObservation } from "./hosted-approval";
import type { CurrentMainRecord, PromotionAttestation } from "./promotion";

export interface ValidateGovernedAcceptanceInput {
  readonly locator: GitLocator;
  readonly policyObject: ExactGitBlobPointer;
  readonly requestObject: ExactGitBlobPointer;
  readonly acceptanceObject: ExactGitBlobPointer;
}

export interface GovernedAcceptanceObservation {
  readonly policy: LifecyclePolicy;
  readonly request: AcceptanceRequest;
  readonly evidence: AcceptanceEvidence;
  readonly policyObject: ExactGitBlobPointer;
  readonly requestObject: ExactGitBlobPointer;
  readonly acceptanceObject: ExactGitBlobPointer;
  readonly approval: HostedApprovalObservation;
}

export type GovernedAcceptanceResult =
  | { readonly kind: "GovernedAccepted"; readonly observation: GovernedAcceptanceObservation }
  | { readonly kind: "RejectedAcceptance"; readonly evidence: AcceptanceEvidence }
  | {
    readonly kind: "InvalidAcceptance";
    readonly code: "INVALID_ACCEPTANCE_RECORD" | "INVALID_MECHANICAL_EVIDENCE";
    readonly reason: string;
  }
  | {
    readonly kind: "BlockedAcceptanceAuthority";
    readonly code: "BLOCKED_ACCEPTANCE_AUTHORITY";
    readonly reason: string;
  };

export interface AttestPromotionInput {
  readonly locator: GitLocator;
  readonly acceptance: GovernedAcceptanceObservation;
  readonly landedReleaseInputObject: ExactGitBlobPointer;
}

export type AttestPromotionResult =
  | { readonly kind: "PromotionAttested"; readonly attestation: PromotionAttestation }
  | {
    readonly kind: "ReleaseInputChanged";
    readonly acceptedDigest: string;
    readonly landedDigest: string;
  }
  | {
    readonly kind: "InvalidReleaseInput";
    readonly side: "accepted" | "landed";
    readonly reason: string;
  }
  | {
    readonly kind: "BlockedRepository";
    readonly state: "DIRTY_REPOSITORY" | "WRONG_REPOSITORY" | "UNREACHABLE_REPOSITORY" | "WRONG_GIT_OBJECT";
    readonly reason: string;
  };

export interface ResolveCurrentMainInput {
  readonly locator: GitLocator;
}

export interface CurrentChannelObservation {
  readonly record: CurrentMainRecord;
  readonly policy: LifecyclePolicy;
  readonly acceptance: GovernedAcceptanceObservation;
  readonly promotion: PromotionAttestation;
}

export type CurrentMainResolution =
  | { readonly kind: "CURRENT_ELIGIBLE"; readonly observation: CurrentChannelObservation }
  | { readonly kind: "ACCEPTED_PENDING_CONVERGENCE"; readonly observation: CurrentChannelObservation }
  | { readonly kind: "CONTENT_AHEAD_OF_ACCEPTANCE"; readonly reason: string }
  | { readonly kind: "BLOCKED_ACCEPTANCE_AUTHORITY"; readonly reason: string }
  | { readonly kind: "STALE_RECORD"; readonly reason: string }
  | { readonly kind: "FORGED_RECORD"; readonly reason: string }
  | { readonly kind: "DIRTY_REPOSITORY"; readonly reason: string }
  | { readonly kind: "WRONG_REPOSITORY"; readonly reason: string }
  | { readonly kind: "UNREACHABLE_REPOSITORY"; readonly reason: string };
