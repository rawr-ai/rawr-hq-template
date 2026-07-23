import type { ReleaseIssue, ReleaseResult } from "../../../../shared/release";

import {
  parseCanonicalRef,
  parseCommit,
  parseGitBlobId,
  parseRelativePath,
  parseRepository,
  parseTree,
  type CanonicalRef,
  type GitBlobId,
  type GitCommitId,
  type GitTreeId,
  type ReleaseRelativePath,
  type RepositoryIdentity,
} from "./primitives";

export interface GitLocator {
  readonly workspacePath: string;
  readonly expectedRepositoryIdentity: RepositoryIdentity;
}

export interface GitBlobSelection {
  readonly repositoryIdentity: RepositoryIdentity;
  readonly ref: CanonicalRef;
  readonly commit: GitCommitId;
  readonly tree: GitTreeId;
  readonly path: ReleaseRelativePath;
}

export interface ExactGitBlobPointer extends GitBlobSelection {
  readonly blob: GitBlobId;
}

export interface ExactGitBlobObservation {
  readonly pointer: ExactGitBlobPointer;
  readonly bytes: Uint8Array;
}

export function createGitBlobSelection(
  input: unknown
): ReleaseResult<GitBlobSelection, ReleaseIssue> {
  return parseGitBlobSelection(input, "gitObject");
}

export function createExactGitBlobPointer(
  input: unknown
): ReleaseResult<ExactGitBlobPointer, ReleaseIssue> {
  return parseExactGitBlobPointer(input, "gitObject");
}

export function parseGitBlobSelection(
  input: unknown,
  path: string
): ReleaseResult<GitBlobSelection, ReleaseIssue> {
  const record = exactRecord(input, ["commit", "path", "ref", "repositoryIdentity", "tree"], path);
  if (!record.ok) return record;

  const fields = [
    parseRepository(record.value.repositoryIdentity, `${path}.repositoryIdentity`),
    parseCanonicalRef(record.value.ref, `${path}.ref`),
    parseCommit(record.value.commit, `${path}.commit`),
    parseTree(record.value.tree, `${path}.tree`),
    parseRelativePath(record.value.path, `${path}.path`),
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

export function parseExactGitBlobPointer(
  input: unknown,
  path: string
): ReleaseResult<ExactGitBlobPointer, ReleaseIssue> {
  const record = exactRecord(
    input,
    ["blob", "commit", "path", "ref", "repositoryIdentity", "tree"],
    path
  );
  if (!record.ok) return record;
  const selection = parseGitBlobSelection(
    {
      repositoryIdentity: record.value.repositoryIdentity,
      ref: record.value.ref,
      commit: record.value.commit,
      tree: record.value.tree,
      path: record.value.path,
    },
    path
  );
  const blob = parseGitBlobId(record.value.blob, `${path}.blob`);
  const issues = [selection, blob].flatMap((result) => (result.ok ? [] : result.issues));
  if (issues.length > 0) return failed(issues);
  if (!selection.ok || !blob.ok)
    return invalid(path, "Exact Git pointer fields did not produce a value");
  return { ok: true, value: Object.freeze({ ...selection.value, blob: blob.value }) };
}

export function sameGitSelection(left: GitBlobSelection, right: GitBlobSelection): boolean {
  return (
    left.repositoryIdentity === right.repositoryIdentity &&
    left.ref === right.ref &&
    left.commit === right.commit &&
    left.tree === right.tree &&
    left.path === right.path
  );
}

function exactRecord(
  input: unknown,
  keys: readonly string[],
  path: string
): ReleaseResult<Record<string, unknown>, ReleaseIssue> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return invalid(path, `Expected exactly: ${keys.join(", ")}`);
  }
  const actual = Object.keys(input).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
    ? { ok: true, value: input as Record<string, unknown> }
    : invalid(path, `Expected exactly: ${keys.join(", ")}`);
}

function invalid(path: string, message: string): ReleaseResult<never, ReleaseIssue> {
  return failed([Object.freeze({ code: "UNKNOWN_FIELD", path, message })]);
}

function failed(issues: readonly ReleaseIssue[]): ReleaseResult<never, ReleaseIssue> {
  const first =
    issues[0] ??
    Object.freeze({
      code: "UNKNOWN_FIELD" as const,
      path: "gitObject",
      message: "Git pointer validation did not produce a value",
    });
  return { ok: false, issues: [first, ...issues.slice(1)] };
}
