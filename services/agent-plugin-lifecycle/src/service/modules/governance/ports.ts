import type {
  ExactGitReader,
  HostedApprovalHistoryReader,
  MechanicalEvidenceReader,
} from "./internal/ports";

export interface GovernanceLifecycleRuntime {
  readonly git: ExactGitReader;
  readonly evidence: MechanicalEvidenceReader;
  readonly approvals: HostedApprovalHistoryReader;
}

export type {
  ExactGitReader,
  GitBlobReadResult,
  GitBooleanReadResult,
  GitChangedPathsResult,
  GitReadFailure,
  GitReadFailureCode,
  HostedApprovalObservation,
  HostedApprovalHistory,
  HostedApprovalHistoryQuery,
  HostedApprovalHistoryReadResult,
  HostedApprovalHistoryReader,
  HostedGovernanceProvider,
  HostedReviewObservation,
  HostedReviewState,
  MechanicalEvidenceReadResult,
  MechanicalEvidenceReader,
  RepositoryInspection,
} from "./internal/ports";

// Read-only Git and hosted-governance adapters consume these service-owned
// value constructors; concrete I/O remains in the CLI runtime binding.
export * from "./internal/domain/git";
export {
  createMechanicalEvidenceObservation,
  createProviderAcceptanceBinding,
  type ProviderAcceptanceBinding,
} from "./internal/domain/evidence";
export * from "./internal/domain/primitives";
