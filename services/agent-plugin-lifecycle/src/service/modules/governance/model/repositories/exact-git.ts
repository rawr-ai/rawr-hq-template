import {
  sameGitPointer,
  type ExactGitBlobObservation,
  type ExactGitBlobPointer,
  type GitBlobSelection,
  type GitLocator,
} from "../dto/git";
import type {
  CanonicalRef,
  GitCommitId,
  GitTreeId,
  ReleaseRelativePath,
  RepositoryIdentity,
} from "../dto/primitives";

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

export type ExactReadResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly failure: GitReadFailure };

export async function readExactBlob(
  reader: ExactGitReader,
  locator: GitLocator,
  pointer: ExactGitBlobPointer,
): Promise<ExactReadResult> {
  const result = await reader.readBlob(locator, pointer);
  if (!result.ok) return result;
  if (!sameGitPointer(result.observation.pointer, pointer)) {
    return {
      ok: false,
      failure: {
        code: "WrongObject",
        message: "Git reader returned bytes for a different repository/ref/commit/tree/path/blob",
      },
    };
  }
  return { ok: true, bytes: result.observation.bytes };
}
