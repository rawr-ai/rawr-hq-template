import type {
  ExactGitBlobObservation,
  GitBlobSelection,
  GitLocator,
} from "../dto/current-main-git";
import type {
  CanonicalRef,
  GitCommitId,
  GitTreeId,
  RepositoryIdentity,
} from "../dto/current-main-primitives";

export type RepositoryInspection =
  | {
      readonly kind: "Ready";
      readonly repositoryIdentity: RepositoryIdentity;
      readonly canonicalRef: CanonicalRef;
      readonly headCommit: GitCommitId;
      readonly headTree: GitTreeId;
    }
  | {
      readonly kind: "WrongRepository";
      readonly actualRepositoryIdentity: string;
    }
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

export interface ExactGitReader {
  readonly inspect: (
    locator: GitLocator,
    canonicalRef: CanonicalRef
  ) => Promise<RepositoryInspection>;
  readonly readFileAtRevision: (
    locator: GitLocator,
    selection: GitBlobSelection
  ) => Promise<GitBlobReadResult>;
  readonly isAncestor: (
    locator: GitLocator,
    ancestorCommit: GitCommitId,
    descendantCommit: GitCommitId
  ) => Promise<boolean>;
}
