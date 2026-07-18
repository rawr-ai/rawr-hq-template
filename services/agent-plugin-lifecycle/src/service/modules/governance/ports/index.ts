import type {
  MechanicalEvidenceHandle,
  MechanicalEvidenceObservation,
} from "../model/dto/evidence";
import type {
  HostedApprovalHistory,
  HostedApprovalHistoryQuery,
  HostedApprovalHistoryReadResult,
  HostedApprovalObservation,
  HostedGovernanceProvider,
  HostedReviewObservation,
  HostedReviewState,
} from "../model/dto/hosted-approval";
import type {
  ExactGitReader,
  GitBlobReadResult,
  GitBooleanReadResult,
  GitChangedPathsResult,
  GitReadFailure,
  GitReadFailureCode,
  RepositoryInspection,
} from "../model/repositories/exact-git";

export type MechanicalEvidenceReadFailureCode =
  | "MissingEvidence"
  | "TamperedEvidence"
  | "UnavailableEvidence";

export type MechanicalEvidenceReadResult =
  | { readonly ok: true; readonly observation: MechanicalEvidenceObservation }
  | {
    readonly ok: false;
    readonly failure: {
      readonly code: MechanicalEvidenceReadFailureCode;
      readonly message: string;
    };
  };

export interface MechanicalEvidenceReader {
  readonly read: (handle: MechanicalEvidenceHandle) => Promise<MechanicalEvidenceReadResult>;
}

export interface HostedApprovalHistoryReader {
  readonly read: (query: HostedApprovalHistoryQuery) => Promise<HostedApprovalHistoryReadResult>;
}

export type {
  ExactGitReader,
  GitBlobReadResult,
  GitBooleanReadResult,
  GitChangedPathsResult,
  GitReadFailure,
  GitReadFailureCode,
  HostedApprovalHistory,
  HostedApprovalHistoryQuery,
  HostedApprovalHistoryReadResult,
  HostedApprovalObservation,
  HostedGovernanceProvider,
  HostedReviewObservation,
  HostedReviewState,
  RepositoryInspection,
};
