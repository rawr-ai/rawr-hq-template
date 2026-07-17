import type {
  CanonicalRef,
  GitCommitId,
  GitTreeId,
  ReleaseRelativePath,
  RepositoryIdentity,
} from "../domain/primitives";
import type {
  ExactGitBlobObservation,
  ExactGitBlobPointer,
  GitBlobSelection,
  GitLocator,
} from "../domain/git";
import type {
  MechanicalEvidenceHandle,
  MechanicalEvidenceObservation,
} from "../domain/evidence";
import type { CanonicalId } from "../domain/primitives";

export type RepositoryInspection =
  | {
    readonly kind: "Ready";
    readonly repositoryIdentity: RepositoryIdentity;
    readonly canonicalRef: CanonicalRef;
    readonly headCommit: GitCommitId;
    readonly headTree: GitTreeId;
  }
  | { readonly kind: "DirtyRepository" }
  | { readonly kind: "WrongRepository"; readonly actualRepositoryIdentity: string }
  | { readonly kind: "UnreachableRepository"; readonly reason: string };

export type GitReadFailureCode =
  | "MissingObject"
  | "WrongObject"
  | "ObjectTooLarge"
  | "UnreachableObject"
  | "ReadFailed";

export interface GitReadFailure {
  readonly code: GitReadFailureCode;
  readonly message: string;
}

export type GitBlobReadResult =
  | { readonly ok: true; readonly observation: ExactGitBlobObservation }
  | { readonly ok: false; readonly failure: GitReadFailure };

export type GitBooleanReadResult =
  | { readonly ok: true; readonly value: boolean }
  | { readonly ok: false; readonly failure: GitReadFailure };

export type GitChangedPathsResult =
  | { readonly ok: true; readonly paths: readonly ReleaseRelativePath[] }
  | { readonly ok: false; readonly failure: GitReadFailure };

export interface ExactGitReader {
  readonly inspect: (locator: GitLocator, canonicalRef: CanonicalRef) => Promise<RepositoryInspection>;
  readonly readBlob: (locator: GitLocator, selection: GitBlobSelection) => Promise<GitBlobReadResult>;
  readonly isAncestor: (
    locator: GitLocator,
    ancestor: GitCommitId,
    descendant: GitCommitId,
  ) => Promise<GitBooleanReadResult>;
  readonly listChangedPaths: (
    locator: GitLocator,
    from: GitCommitId,
    to: GitCommitId,
  ) => Promise<GitChangedPathsResult>;
}

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

export interface HostedApprovalHistoryReader {
  readonly read: (query: HostedApprovalHistoryQuery) => Promise<HostedApprovalHistoryReadResult>;
}
