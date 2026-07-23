import {
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  type GitCommitId,
  type GitTreeId,
  type ReleaseIssue,
  type ReleaseRelativePath,
  type ReleaseResult,
  type RepositoryIdentity,
} from "../../../../shared/release";

declare const canonicalRefBrand: unique symbol;
declare const gitBlobIdBrand: unique symbol;

export type CanonicalRef = string & { readonly [canonicalRefBrand]: "CanonicalRef" };
export type GitBlobId = string & { readonly [gitBlobIdBrand]: "GitBlobId" };

export type { GitCommitId, GitTreeId, ReleaseRelativePath, RepositoryIdentity };

const REF_PATTERN = /^refs\/(?:heads|tags)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const GIT_OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

export function parseCanonicalRef(
  value: unknown,
  path: string
): ReleaseResult<CanonicalRef, ReleaseIssue> {
  if (
    typeof value !== "string" ||
    !REF_PATTERN.test(value) ||
    value.includes("..") ||
    value.includes("//") ||
    value.endsWith(".lock") ||
    value.endsWith("/")
  ) {
    return invalidGitIdentity(path, "Expected a qualified canonical Git ref");
  }
  return { ok: true, value: value as CanonicalRef };
}

export function parseGitBlobId(
  value: unknown,
  path: string
): ReleaseResult<GitBlobId, ReleaseIssue> {
  return typeof value === "string" && GIT_OBJECT_PATTERN.test(value)
    ? { ok: true, value: value as GitBlobId }
    : invalidGitIdentity(path, "Expected an exact Git blob object ID");
}

export const parseRepository = parseRepositoryIdentity;
export const parseCommit = parseGitCommitId;
export const parseTree = parseGitTreeId;
export const parseRelativePath = parseReleaseRelativePath;

function invalidGitIdentity(path: string, message: string): ReleaseResult<never, ReleaseIssue> {
  return {
    ok: false,
    issues: [Object.freeze({ code: "INVALID_GIT_OBJECT_ID", path, message })],
  };
}
