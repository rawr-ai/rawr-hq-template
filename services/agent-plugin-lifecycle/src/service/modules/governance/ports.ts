import type {
  ExactGitReader,
  HostedApprovalHistoryReader,
  MechanicalEvidenceReader,
} from "./ports/index";

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
} from "./ports/index";

export type * from "./model/dto/git";
export type * from "./model/dto/evidence";
export type * from "./model/dto/primitives";
