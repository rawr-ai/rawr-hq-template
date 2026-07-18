import type { ExactGitBlobPointer } from "./git";
import type {
  CanonicalId,
  GitCommitId,
  RepositoryIdentity,
} from "./primitives";

export type HostedGovernanceProvider = "github";

export type HostedReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "PENDING";

export interface HostedApprovalHistoryQuery {
  readonly provider: HostedGovernanceProvider;
  readonly repositoryIdentity: RepositoryIdentity;
  readonly pullRequest: number;
  readonly revision: GitCommitId;
}

export interface HostedReviewObservation {
  readonly recordId: number;
  readonly state: HostedReviewState;
  readonly revision: string;
  readonly actorIdentity: string;
}

export interface HostedApprovalHistory {
  readonly provider: string;
  readonly selector: Readonly<{
    readonly provider: string;
    readonly repositoryIdentity: string;
    readonly pullRequest: number;
    readonly revision: string;
  }>;
  /** Required order for selecting the latest authority-changing review. */
  readonly order: "oldest-to-newest";
  readonly observations: readonly HostedReviewObservation[];
}

export interface HostedApprovalObservation {
  readonly provider: HostedGovernanceProvider;
  readonly pullRequest: number;
  readonly recordId: CanonicalId;
  readonly object: ExactGitBlobPointer;
  readonly approverIdentity: CanonicalId;
  readonly decision: "approved" | "rejected";
  readonly outcome: "accepted";
}

export type HostedApprovalHistoryReadResult =
  | { readonly ok: true; readonly history: HostedApprovalHistory }
  | {
    readonly ok: false;
    readonly failure: {
      readonly code: "UnavailableApproval";
      readonly message: string;
    };
  };
