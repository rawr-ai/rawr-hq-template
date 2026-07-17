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

export type * from "./internal/domain/git";
export type * from "./internal/domain/evidence";
export type * from "./internal/domain/primitives";
