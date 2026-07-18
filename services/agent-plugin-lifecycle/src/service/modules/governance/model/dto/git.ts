import type { CanonicalJsonValue } from "../helpers/canonical";
import { failures, success, type PromotionIssue, type PromotionResult } from "../errors/promotion-result";
import { collect, exactRecord } from "../helpers/schema";
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

export function createGitBlobSelection(input: unknown): PromotionResult<GitBlobSelection> {
  return parseGitBlobSelection(input, "gitObject");
}

export function createExactGitBlobPointer(input: unknown): PromotionResult<ExactGitBlobPointer> {
  return parseExactGitBlobPointer(input, "gitObject");
}

export function parseGitBlobSelection(
  input: unknown,
  path: string,
): PromotionResult<GitBlobSelection> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, ["commit", "path", "ref", "repositoryIdentity", "tree"], path, issues);
  if (record === undefined) return failures(issues);
  const repositoryIdentity = collect(parseRepository(record.repositoryIdentity, `${path}.repositoryIdentity`), issues);
  const ref = collect(parseCanonicalRef(record.ref, `${path}.ref`), issues);
  const commit = collect(parseCommit(record.commit, `${path}.commit`), issues);
  const tree = collect(parseTree(record.tree, `${path}.tree`), issues);
  const relativePath = collect(parseRelativePath(record.path, `${path}.path`), issues);
  if (issues.length > 0 || repositoryIdentity === undefined || ref === undefined || commit === undefined || tree === undefined || relativePath === undefined) {
    return failures(issues);
  }
  return success(Object.freeze({ repositoryIdentity, ref, commit, tree, path: relativePath }));
}

export function parseExactGitBlobPointer(
  input: unknown,
  path: string,
): PromotionResult<ExactGitBlobPointer> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, ["blob", "commit", "path", "ref", "repositoryIdentity", "tree"], path, issues);
  if (record === undefined) return failures(issues);
  const selection = collect(parseGitBlobSelection({
    repositoryIdentity: record.repositoryIdentity,
    ref: record.ref,
    commit: record.commit,
    tree: record.tree,
    path: record.path,
  }, path), issues);
  const blob = collect(parseGitBlobId(record.blob, `${path}.blob`), issues);
  if (issues.length > 0 || selection === undefined || blob === undefined) return failures(issues);
  return success(Object.freeze({ ...selection, blob }));
}

export function gitSelectionValue(value: GitBlobSelection): CanonicalJsonValue {
  return {
    repositoryIdentity: value.repositoryIdentity,
    ref: value.ref,
    commit: value.commit,
    tree: value.tree,
    path: value.path,
  };
}

export function gitPointerValue(value: ExactGitBlobPointer): CanonicalJsonValue {
  return {
    ...gitSelectionValue(value) as { readonly [key: string]: CanonicalJsonValue },
    blob: value.blob,
  };
}

export function sameGitSelection(left: GitBlobSelection, right: GitBlobSelection): boolean {
  return left.repositoryIdentity === right.repositoryIdentity
    && left.ref === right.ref
    && left.commit === right.commit
    && left.tree === right.tree
    && left.path === right.path;
}

export function sameGitPointer(left: ExactGitBlobPointer, right: ExactGitBlobPointer): boolean {
  return sameGitSelection(left, right) && left.blob === right.blob;
}
