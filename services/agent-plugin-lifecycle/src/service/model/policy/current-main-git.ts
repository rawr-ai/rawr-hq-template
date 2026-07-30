import { Value } from "typebox/value";
import {
  type CanonicalRef,
  CanonicalRefSchema,
  type ExactGitBlobPointer,
  ExactGitBlobPointerSchema,
  type GitBlobId,
  GitBlobIdSchema,
  type GitBlobSelection,
  GitBlobSelectionSchema,
} from "../dto/current-main-git";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import {
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "./release-identity";
import { releaseIssue } from "./release-issue";

/** Admits one qualified canonical branch or tag ref for current-main selection. */
export function parseCanonicalRef(
  value: unknown,
  path: string
): ReleaseResult<CanonicalRef, ReleaseIssue> {
  if (!Value.Check(CanonicalRefSchema, value)) {
    return invalidGitIdentity(path, "Expected a qualified canonical Git ref");
  }
  return { ok: true, value };
}

function parseGitBlobId(value: unknown, path: string): ReleaseResult<GitBlobId, ReleaseIssue> {
  return Value.Check(GitBlobIdSchema, value)
    ? { ok: true, value }
    : invalidGitIdentity(path, "Expected an exact Git blob object ID");
}

/** Admits and freezes one exact Git path selection. */
export function parseGitBlobSelection(
  input: unknown,
  path: string
): ReleaseResult<GitBlobSelection, ReleaseIssue> {
  if (Value.Errors(GitBlobSelectionSchema, input).some(({ instancePath }) => instancePath === "")) {
    return invalid(
      path,
      `Expected exactly: ${Object.keys(GitBlobSelectionSchema.properties).sort().join(", ")}`
    );
  }
  const record = input as Record<keyof GitBlobSelection, unknown>;

  const fields = [
    parseRepositoryIdentity(record.repositoryIdentity, `${path}.repositoryIdentity`),
    parseCanonicalRef(record.ref, `${path}.ref`),
    parseGitCommitId(record.commit, `${path}.commit`),
    parseGitTreeId(record.tree, `${path}.tree`),
    parseReleaseRelativePath(record.path, `${path}.path`),
  ] as const;
  const issues = fields.flatMap((result) => (result.ok ? [] : result.issues));
  if (issues.length > 0) return failed(issues);
  if (!fields[0].ok || !fields[1].ok || !fields[2].ok || !fields[3].ok || !fields[4].ok) {
    return invalid(path, "Git selection fields did not produce a value");
  }
  return {
    ok: true,
    value: Object.freeze({
      repositoryIdentity: fields[0].value,
      ref: fields[1].value,
      commit: fields[2].value,
      tree: fields[3].value,
      path: fields[4].value,
    }),
  };
}

function parseExactGitBlobPointer(
  input: unknown,
  path: string
): ReleaseResult<ExactGitBlobPointer, ReleaseIssue> {
  if (
    Value.Errors(ExactGitBlobPointerSchema, input).some(({ instancePath }) => instancePath === "")
  ) {
    return invalid(
      path,
      `Expected exactly: ${Object.keys(ExactGitBlobPointerSchema.properties).sort().join(", ")}`
    );
  }
  const record = input as Record<keyof ExactGitBlobPointer, unknown>;
  const selection = parseGitBlobSelection(
    {
      repositoryIdentity: record.repositoryIdentity,
      ref: record.ref,
      commit: record.commit,
      tree: record.tree,
      path: record.path,
    },
    path
  );
  const blob = parseGitBlobId(record.blob, `${path}.blob`);
  const issues = [selection, blob].flatMap((result) => (result.ok ? [] : result.issues));
  if (issues.length > 0) return failed(issues);
  if (!selection.ok || !blob.ok)
    return invalid(path, "Exact Git pointer fields did not produce a value");
  return { ok: true, value: Object.freeze({ ...selection.value, blob: blob.value }) };
}

/** Constructs an exact Git blob pointer at the canonical public diagnostic path. */
export function createExactGitBlobPointer(
  input: unknown
): ReleaseResult<ExactGitBlobPointer, ReleaseIssue> {
  return parseExactGitBlobPointer(input, "gitObject");
}

function invalidGitIdentity(path: string, message: string): ReleaseResult<never, ReleaseIssue> {
  return {
    ok: false,
    issues: [releaseIssue("INVALID_GIT_OBJECT_ID", path, message)],
  };
}

function invalid(path: string, message: string): ReleaseResult<never, ReleaseIssue> {
  return failed([releaseIssue("UNKNOWN_FIELD", path, message)]);
}

function failed(issues: readonly ReleaseIssue[]): ReleaseResult<never, ReleaseIssue> {
  const first =
    issues[0] ??
    releaseIssue("UNKNOWN_FIELD", "gitObject", "Git pointer validation did not produce a value");
  return { ok: false, issues: [first, ...issues.slice(1)] };
}
