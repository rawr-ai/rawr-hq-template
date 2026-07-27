import type {
  GitCommitId,
  GitTreeId,
  ReleaseRelativePath,
  RepositoryIdentity,
} from "./release-identity";

declare const canonicalRefBrand: unique symbol;
declare const gitBlobIdBrand: unique symbol;

/** Identifies one qualified canonical branch or tag ref used by current-main selection. */
export type CanonicalRef = string & { readonly [canonicalRefBrand]: "CanonicalRef" };

/** Identifies the exact Git blob object read for a current-main selection. */
export type GitBlobId = string & { readonly [gitBlobIdBrand]: "GitBlobId" };

/** Locates the expected logical repository behind one local content workspace. */
export interface GitLocator {
  readonly workspacePath: string;
  readonly expectedRepositoryIdentity: RepositoryIdentity;
}

/** Selects one exact path from a qualified Git ref, commit, and tree. */
export interface GitBlobSelection {
  readonly repositoryIdentity: RepositoryIdentity;
  readonly ref: CanonicalRef;
  readonly commit: GitCommitId;
  readonly tree: GitTreeId;
  readonly path: ReleaseRelativePath;
}

/** Binds one selected Git path to its exact blob object. */
export interface ExactGitBlobPointer extends GitBlobSelection {
  readonly blob: GitBlobId;
}

/** Carries exact selected Git bytes together with their verified object identities. */
export interface ExactGitBlobObservation {
  readonly pointer: ExactGitBlobPointer;
  readonly bytes: Uint8Array;
}
