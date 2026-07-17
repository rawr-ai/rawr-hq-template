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

export type HostedGovernanceProvider = "graphite" | "github";

export interface HostedApprovalQuery {
  readonly object: ExactGitBlobPointer;
  readonly outcome: "accepted";
}

export interface HostedApprovalObservation {
  readonly provider: HostedGovernanceProvider;
  readonly recordId: CanonicalId;
  readonly object: ExactGitBlobPointer;
  readonly approverIdentity: CanonicalId;
  readonly decision: "approved" | "rejected";
  readonly outcome: "accepted";
}

export type HostedApprovalReadResult =
  | { readonly ok: true; readonly observation: HostedApprovalObservation }
  | {
    readonly ok: false;
    readonly failure: {
      readonly code: "MissingApproval" | "WrongObject" | "UnavailableApproval";
      readonly message: string;
    };
  };

export interface HostedApprovalReader {
  readonly read: (query: HostedApprovalQuery) => Promise<HostedApprovalReadResult>;
}
