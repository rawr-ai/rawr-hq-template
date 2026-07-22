import type { ExactGitBlobObservation, GitBlobSelection, GitLocator } from "../dto/git";
import type { CanonicalRef, GitCommitId, GitTreeId, RepositoryIdentity } from "../dto/primitives";

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

export interface ExactGitReader {
  readonly inspect: (
    locator: GitLocator,
    canonicalRef: CanonicalRef
  ) => Promise<RepositoryInspection>;
  readonly readBlob: (
    locator: GitLocator,
    selection: GitBlobSelection
  ) => Promise<GitBlobReadResult>;
  readonly isAncestor: (
    locator: GitLocator,
    ancestor: GitCommitId,
    descendant: GitCommitId
  ) => Promise<GitBooleanReadResult>;
}
