import type { TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  type ContentAuthority,
  ContentAuthoritySchema,
  type GitCommitId,
  GitCommitIdSchema,
  type GitTreeId,
  GitTreeIdSchema,
  MAX_RELEASE_RELATIVE_PATH_BYTES,
  type OwnershipIdentity,
  OwnershipIdentitySchema,
  type PluginId,
  PluginIdSchema,
  type ReleaseRelativePath,
  ReleaseRelativePathSchema,
  type RepositoryIdentity,
  RepositoryIdentitySchema,
} from "../dto/release-identity";
import type { ReleaseIssue, ReleaseIssueCode } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { releaseIssue } from "./release-issue";
import { failure, success } from "./release-result";

const encoder = new TextEncoder();

/** Admits one curated content-authority identity with release diagnostics. */
export function parseContentAuthority(
  value: unknown,
  path = "contentAuthority"
): ReleaseResult<ContentAuthority, ReleaseIssue> {
  return parseStringSchema(
    ContentAuthoritySchema,
    isContentAuthority,
    value,
    path,
    "INVALID_CONTENT_AUTHORITY",
    "Content authority must be canonical"
  );
}

/** Admits one logical repository identity with release diagnostics. */
export function parseRepositoryIdentity(
  value: unknown,
  path = "repositoryIdentity"
): ReleaseResult<RepositoryIdentity, ReleaseIssue> {
  return parseStringSchema(
    RepositoryIdentitySchema,
    isRepositoryIdentity,
    value,
    path,
    "INVALID_REPOSITORY_IDENTITY",
    "Repository identity must be logical and path-safe"
  );
}

/** Admits one exact Git commit identity with release diagnostics. */
export function parseGitCommitId(
  value: unknown,
  path = "sourceCommit"
): ReleaseResult<GitCommitId, ReleaseIssue> {
  return parseStringSchema(
    GitCommitIdSchema,
    isGitCommitId,
    value,
    path,
    "INVALID_GIT_OBJECT_ID",
    "Invalid Git object identity"
  );
}

/** Admits one exact Git tree identity with release diagnostics. */
export function parseGitTreeId(
  value: unknown,
  path = "sourceTree"
): ReleaseResult<GitTreeId, ReleaseIssue> {
  return parseStringSchema(
    GitTreeIdSchema,
    isGitTreeId,
    value,
    path,
    "INVALID_GIT_OBJECT_ID",
    "Invalid Git object identity"
  );
}

/** Admits one curated plugin identity with release diagnostics. */
export function parsePluginId(
  value: unknown,
  path = "pluginId"
): ReleaseResult<PluginId, ReleaseIssue> {
  return parseStringSchema(
    PluginIdSchema,
    isPluginId,
    value,
    path,
    "INVALID_PLUGIN_ID",
    "Invalid plugin identity"
  );
}

/** Admits one distribution ownership identity with release diagnostics. */
export function parseOwnershipIdentity(
  value: unknown,
  path = "identity"
): ReleaseResult<OwnershipIdentity, ReleaseIssue> {
  return parseStringSchema(
    OwnershipIdentitySchema,
    isOwnershipIdentity,
    value,
    path,
    "INVALID_OWNERSHIP_IDENTITY",
    "Invalid ownership identity"
  );
}

/** Admits one canonical release-relative path with release diagnostics. */
export function parseReleaseRelativePath(
  value: unknown,
  path = "path"
): ReleaseResult<ReleaseRelativePath, ReleaseIssue> {
  return parseStringSchema(
    ReleaseRelativePathSchema,
    isReleaseRelativePath,
    value,
    path,
    "INVALID_RELATIVE_PATH",
    "Path must be a canonical POSIX relative path"
  );
}

function parseStringSchema<T extends string>(
  schema: TSchema,
  admits: (value: string) => value is T,
  value: unknown,
  path: string,
  invalidCode: ReleaseIssueCode,
  invalidMessage: string
): ReleaseResult<T, ReleaseIssue> {
  if (typeof value === "string" && Value.Check(schema, value) && admits(value)) {
    return success(value);
  }
  return failure([
    typeof value === "string"
      ? releaseIssue(invalidCode, path, invalidMessage)
      : releaseIssue("EXPECTED_STRING", path, "Value must be a string"),
  ]);
}

function isContentAuthority(value: string): value is ContentAuthority {
  return Value.Check(ContentAuthoritySchema, value);
}

function isRepositoryIdentity(value: string): value is RepositoryIdentity {
  return Value.Check(RepositoryIdentitySchema, value);
}

function isGitCommitId(value: string): value is GitCommitId {
  return Value.Check(GitCommitIdSchema, value);
}

function isGitTreeId(value: string): value is GitTreeId {
  return Value.Check(GitTreeIdSchema, value);
}

function isPluginId(value: string): value is PluginId {
  return Value.Check(PluginIdSchema, value);
}

function isOwnershipIdentity(value: string): value is OwnershipIdentity {
  return Value.Check(OwnershipIdentitySchema, value);
}

function isReleaseRelativePath(value: string): value is ReleaseRelativePath {
  return (
    Value.Check(ReleaseRelativePathSchema, value) &&
    value.normalize("NFC") === value &&
    encoder.encode(value).byteLength <= MAX_RELEASE_RELATIVE_PATH_BYTES
  );
}
