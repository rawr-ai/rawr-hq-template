import { createHash } from "node:crypto";

import { issue, type ReleaseIssue } from "./issues";
import { parseCanonicalString, parseInteger } from "./parse";
import { failure, success, type ReleaseResult } from "./result";

declare const contentAuthorityBrand: unique symbol;
declare const repositoryIdentityBrand: unique symbol;
declare const gitCommitIdBrand: unique symbol;
declare const gitTreeIdBrand: unique symbol;
declare const pluginIdBrand: unique symbol;
declare const ownershipIdentityBrand: unique symbol;
declare const releaseRelativePathBrand: unique symbol;
declare const contentDigestBrand: unique symbol;
declare const releaseInputDigestBrand: unique symbol;
declare const payloadDigestBrand: unique symbol;
declare const releaseDigestBrand: unique symbol;
declare const artifactDigestBrand: unique symbol;
declare const releaseSetDigestBrand: unique symbol;

export type ContentAuthority = string & { readonly [contentAuthorityBrand]: "ContentAuthority" };
export type RepositoryIdentity = string & { readonly [repositoryIdentityBrand]: "RepositoryIdentity" };
export type GitCommitId = string & { readonly [gitCommitIdBrand]: "GitCommitId" };
export type GitTreeId = string & { readonly [gitTreeIdBrand]: "GitTreeId" };
export type PluginId = string & { readonly [pluginIdBrand]: "PluginId" };
export type OwnershipIdentity = string & { readonly [ownershipIdentityBrand]: "OwnershipIdentity" };
export type ReleaseRelativePath = string & { readonly [releaseRelativePathBrand]: "ReleaseRelativePath" };
export type ContentDigest = string & { readonly [contentDigestBrand]: "ContentDigest" };
export type ReleaseInputDigest = string & { readonly [releaseInputDigestBrand]: "ReleaseInputDigest" };
export type PayloadDigest = string & { readonly [payloadDigestBrand]: "PayloadDigest" };
export type ReleaseDigest = string & { readonly [releaseDigestBrand]: "ReleaseDigest" };
export type ArtifactDigest = string & { readonly [artifactDigestBrand]: "ArtifactDigest" };
export type ReleaseSetDigest = string & { readonly [releaseSetDigestBrand]: "ReleaseSetDigest" };

export const RELEASE_INPUT_SCHEMA_VERSION = 1 as const;
export const PAYLOAD_PROTOCOL_VERSION = 1 as const;
export const AGENT_PLUGIN_RELEASE_SCHEMA_VERSION = 1 as const;
export const ARTIFACT_PROTOCOL_VERSION = 1 as const;
export const AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION = 1 as const;
export const OWNERSHIP_INDEX_SCHEMA_VERSION = 1 as const;
export const BUILDER_PROTOCOL_VERSION = 1 as const;

export const MAX_RELEASE_MEMBERS = 1_024;
export const MAX_OWNERSHIP_CLAIMS = 16_384;
export const MAX_PAYLOAD_ENTRIES_PER_MEMBER = 16_384;
export const MAX_PAYLOAD_BYTES_PER_MEMBER = 64 * 1024 * 1024;
export const MAX_RELEASE_SET_PAYLOAD_BYTES = 64 * 1024 * 1024;
export const MAX_RELEASE_INPUT_ENVELOPE_BYTES = 96 * 1024 * 1024;
export const MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES = 3 * MAX_RELEASE_INPUT_ENVELOPE_BYTES;
export const MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES = MAX_RELEASE_INPUT_ENVELOPE_BYTES;
export const MAX_RELEASE_RELATIVE_PATH_BYTES = 1_024;
export const MAX_CANONICAL_ID_BYTES = 512;
export const MAX_PROVENANCE_BINDINGS = 16_384;

export type ReleaseInputSchemaVersion = typeof RELEASE_INPUT_SCHEMA_VERSION;
export type PayloadProtocolVersion = typeof PAYLOAD_PROTOCOL_VERSION;
export type AgentPluginReleaseSchemaVersion = typeof AGENT_PLUGIN_RELEASE_SCHEMA_VERSION;
export type ArtifactProtocolVersion = typeof ARTIFACT_PROTOCOL_VERSION;
export type AgentPluginReleaseSetSchemaVersion = typeof AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION;
export type OwnershipIndexSchemaVersion = typeof OWNERSHIP_INDEX_SCHEMA_VERSION;
export type BuilderProtocolVersion = typeof BUILDER_PROTOCOL_VERSION;
export type NormalizedFileMode = 0o644 | 0o755;

const encoder = new TextEncoder();
const CONTENT_AUTHORITY_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/u;
const REPOSITORY_IDENTITY_PATTERN = /^[a-z][a-z0-9+.-]*:[a-z0-9][a-z0-9._~/-]*$/u;
const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const OWNERSHIP_IDENTITY_PATTERN = /^[a-z0-9@][a-z0-9@._:/-]*$/u;
const GIT_OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const CONTENT_DIGEST_PATTERN = /^sha256_[0-9a-f]{64}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export function parseContentAuthority(
  value: unknown,
  path = "contentAuthority",
): ReleaseResult<ContentAuthority, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const parsed = parseCanonicalString(value, path, issues, {
    code: "INVALID_CONTENT_AUTHORITY",
    maxBytes: MAX_CANONICAL_ID_BYTES,
    pattern: CONTENT_AUTHORITY_PATTERN,
  });
  return parsed === undefined
    ? failure([issues[0] ?? issue("INVALID_CONTENT_AUTHORITY", path, "Invalid content authority")])
    : success(parsed as ContentAuthority);
}

export function parseRepositoryIdentity(
  value: unknown,
  path = "repositoryIdentity",
): ReleaseResult<RepositoryIdentity, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const parsed = parseCanonicalString(value, path, issues, {
    code: "INVALID_REPOSITORY_IDENTITY",
    maxBytes: MAX_CANONICAL_ID_BYTES,
    pattern: REPOSITORY_IDENTITY_PATTERN,
  });
  if (parsed !== undefined && (parsed.startsWith("file:") || hasUnsafeSegments(parsed.slice(parsed.indexOf(":") + 1)))) {
    issues.push(issue("INVALID_REPOSITORY_IDENTITY", path, "Repository identity must be logical and path-safe"));
  }
  return parsed === undefined || issues.length > 0
    ? failure([issues[0] ?? issue("INVALID_REPOSITORY_IDENTITY", path, "Invalid repository identity")])
    : success(parsed as RepositoryIdentity);
}

export function parseGitCommitId(value: unknown, path = "sourceCommit"): ReleaseResult<GitCommitId, ReleaseIssue> {
  return parseGitObject(value, path, (parsed) => parsed as GitCommitId);
}

export function parseGitTreeId(value: unknown, path = "sourceTree"): ReleaseResult<GitTreeId, ReleaseIssue> {
  return parseGitObject(value, path, (parsed) => parsed as GitTreeId);
}

export function parsePluginId(value: unknown, path = "pluginId"): ReleaseResult<PluginId, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const parsed = parseCanonicalString(value, path, issues, {
    code: "INVALID_PLUGIN_ID",
    maxBytes: MAX_CANONICAL_ID_BYTES,
    pattern: PLUGIN_ID_PATTERN,
  });
  return parsed === undefined
    ? failure([issues[0] ?? issue("INVALID_PLUGIN_ID", path, "Invalid plugin identity")])
    : success(parsed as PluginId);
}

export function parseOwnershipIdentity(
  value: unknown,
  path = "identity",
): ReleaseResult<OwnershipIdentity, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const parsed = parseCanonicalString(value, path, issues, {
    code: "INVALID_OWNERSHIP_IDENTITY",
    maxBytes: MAX_CANONICAL_ID_BYTES,
    pattern: OWNERSHIP_IDENTITY_PATTERN,
  });
  return parsed === undefined || hasUnsafeSegments(parsed)
    ? failure([issues[0] ?? issue("INVALID_OWNERSHIP_IDENTITY", path, "Invalid ownership identity")])
    : success(parsed as OwnershipIdentity);
}

export function parseReleaseRelativePath(
  value: unknown,
  path = "path",
): ReleaseResult<ReleaseRelativePath, ReleaseIssue> {
  if (typeof value !== "string") {
    return failure([issue("EXPECTED_STRING", path, "Relative path must be a string")]);
  }
  if (
    value.length === 0
    || value.startsWith("/")
    || value.endsWith("/")
    || value.includes("\\")
    || value.includes(":")
    || CONTROL_CHARACTER_PATTERN.test(value)
    || value.normalize("NFC") !== value
    || hasUnsafeSegments(value)
    || encoder.encode(value).byteLength > MAX_RELEASE_RELATIVE_PATH_BYTES
  ) {
    return failure([issue("INVALID_RELATIVE_PATH", path, "Path must be a canonical POSIX relative path")]);
  }
  return success(value as ReleaseRelativePath);
}

export function parseNormalizedFileMode(
  value: unknown,
  path = "mode",
): ReleaseResult<NormalizedFileMode, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const parsed = parseInteger(value, path, issues);
  if (parsed !== 0o644 && parsed !== 0o755) {
    return failure([issues[0] ?? issue("INVALID_MODE", path, "File mode must be normalized to 0644 or 0755", {
      expected: "0644|0755",
      actual: parsed === undefined ? String(value) : parsed,
    })]);
  }
  return success(parsed);
}

export function parseContentDigest(value: unknown, path = "digest"): ReleaseResult<ContentDigest, ReleaseIssue> {
  return parseTaggedDigest(value, path, CONTENT_DIGEST_PATTERN, (parsed) => parsed as ContentDigest);
}

export function parseReleaseInputDigest(
  value: unknown,
  path = "releaseInputDigest",
): ReleaseResult<ReleaseInputDigest, ReleaseIssue> {
  return parseDomainDigest(value, path, "ri1_", (parsed) => parsed as ReleaseInputDigest);
}

export function parsePayloadDigest(
  value: unknown,
  path = "payloadDigest",
): ReleaseResult<PayloadDigest, ReleaseIssue> {
  return parseDomainDigest(value, path, "pd1_", (parsed) => parsed as PayloadDigest);
}

export function parseReleaseDigest(
  value: unknown,
  path = "releaseDigest",
): ReleaseResult<ReleaseDigest, ReleaseIssue> {
  return parseDomainDigest(value, path, "rd1_", (parsed) => parsed as ReleaseDigest);
}

export function parseArtifactDigest(
  value: unknown,
  path = "artifactDigest",
): ReleaseResult<ArtifactDigest, ReleaseIssue> {
  return parseDomainDigest(value, path, "ad1_", (parsed) => parsed as ArtifactDigest);
}

export function parseReleaseSetDigest(
  value: unknown,
  path = "releaseSetDigest",
): ReleaseResult<ReleaseSetDigest, ReleaseIssue> {
  return parseDomainDigest(value, path, "rs1_", (parsed) => parsed as ReleaseSetDigest);
}

export function contentDigest(bytes: Uint8Array): ContentDigest {
  return `sha256_${sha256Hex(bytes)}` as ContentDigest;
}

export function releaseInputDigest(bytes: Uint8Array): ReleaseInputDigest {
  return `ri1_${sha256Hex(bytes)}` as ReleaseInputDigest;
}

export function payloadDigest(bytes: Uint8Array): PayloadDigest {
  return `pd1_${sha256Hex(bytes)}` as PayloadDigest;
}

export function releaseDigest(bytes: Uint8Array): ReleaseDigest {
  return `rd1_${sha256Hex(bytes)}` as ReleaseDigest;
}

export function artifactDigest(bytes: Uint8Array): ArtifactDigest {
  return `ad1_${sha256Hex(bytes)}` as ArtifactDigest;
}

export function releaseSetDigest(bytes: Uint8Array): ReleaseSetDigest {
  return `rs1_${sha256Hex(bytes)}` as ReleaseSetDigest;
}

export function compareCanonicalText(left: string, right: string): number {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.length - rightBytes.length;
}

function parseGitObject<T extends string>(
  value: unknown,
  path: string,
  brand: (value: string) => T,
): ReleaseResult<T, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const parsed = parseCanonicalString(value, path, issues, {
    code: "INVALID_GIT_OBJECT_ID",
    minBytes: 40,
    maxBytes: 64,
    pattern: GIT_OBJECT_PATTERN,
  });
  return parsed === undefined
    ? failure([issues[0] ?? issue("INVALID_GIT_OBJECT_ID", path, "Invalid Git object identity")])
    : success(brand(parsed));
}

function parseDomainDigest<T extends string>(
  value: unknown,
  path: string,
  prefix: "ri1_" | "pd1_" | "rd1_" | "ad1_" | "rs1_",
  brand: (value: string) => T,
): ReleaseResult<T, ReleaseIssue> {
  const pattern = new RegExp(`^${prefix}[0-9a-f]{64}$`, "u");
  return parseTaggedDigest(value, path, pattern, brand);
}

function parseTaggedDigest<T extends string>(
  value: unknown,
  path: string,
  pattern: RegExp,
  brand: (value: string) => T,
): ReleaseResult<T, ReleaseIssue> {
  if (typeof value !== "string") {
    return failure([issue("EXPECTED_STRING", path, "Digest must be a string")]);
  }
  if (!pattern.test(value)) {
    return failure([issue("INVALID_DIGEST", path, "Digest has the wrong domain or encoding")]);
  }
  return success(brand(value));
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hasUnsafeSegments(value: string): boolean {
  const segments = value.split("/");
  return segments.some((segment) => segment.length === 0 || segment === "." || segment === "..");
}
