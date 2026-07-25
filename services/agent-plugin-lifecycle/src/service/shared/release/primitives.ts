import { createHash } from "node:crypto";

import { Refine, type Static, type TSchema, Type } from "typebox";
import { Value } from "typebox/value";

import { issue, type ReleaseIssue, type ReleaseIssueCode } from "./issues";
import { failure, type ReleaseResult, success } from "./result";

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

type ContentAuthorityBrand = string & { readonly [contentAuthorityBrand]: "ContentAuthority" };
type RepositoryIdentityBrand = string & {
  readonly [repositoryIdentityBrand]: "RepositoryIdentity";
};
type GitCommitIdBrand = string & { readonly [gitCommitIdBrand]: "GitCommitId" };
type GitTreeIdBrand = string & { readonly [gitTreeIdBrand]: "GitTreeId" };
type PluginIdBrand = string & { readonly [pluginIdBrand]: "PluginId" };
type OwnershipIdentityBrand = string & {
  readonly [ownershipIdentityBrand]: "OwnershipIdentity";
};
type ReleaseRelativePathBrand = string & {
  readonly [releaseRelativePathBrand]: "ReleaseRelativePath";
};
type ContentDigestBrand = string & { readonly [contentDigestBrand]: "ContentDigest" };
type ReleaseInputDigestBrand = string & {
  readonly [releaseInputDigestBrand]: "ReleaseInputDigest";
};
type PayloadDigestBrand = string & { readonly [payloadDigestBrand]: "PayloadDigest" };
type ReleaseDigestBrand = string & { readonly [releaseDigestBrand]: "ReleaseDigest" };
type ArtifactDigestBrand = string & { readonly [artifactDigestBrand]: "ArtifactDigest" };
type ReleaseSetDigestBrand = string & { readonly [releaseSetDigestBrand]: "ReleaseSetDigest" };

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

const encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

/** Identifies the curated content authority that owns one release input. */
export const ContentAuthoritySchema = Type.Unsafe<ContentAuthorityBrand>(
  Type.String({
    minLength: 1,
    maxLength: MAX_CANONICAL_ID_BYTES,
    pattern: "^[a-z0-9][a-z0-9._:-]*$",
  })
);

/** Identifies a logical source repository without treating a local path as identity. */
export const RepositoryIdentitySchema = Type.Unsafe<RepositoryIdentityBrand>(
  Type.String({
    minLength: 3,
    maxLength: MAX_CANONICAL_ID_BYTES,
    pattern:
      "^(?!file:)[a-z][a-z0-9+.-]*:[a-z0-9][a-z0-9._~-]*(?:/(?!\\.{1,2}(?:/|$))[a-z0-9._~-]+)*$",
  })
);

const GitObjectIdSchema = Type.String({
  minLength: 40,
  maxLength: 64,
  pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
});

/** Identifies the exact source commit admitted to release construction. */
export const GitCommitIdSchema = Type.Unsafe<GitCommitIdBrand>(GitObjectIdSchema);

/** Identifies the exact source tree admitted to release construction. */
export const GitTreeIdSchema = Type.Unsafe<GitTreeIdBrand>(GitObjectIdSchema);

/** Identifies one curated agent-plugin release member. */
export const PluginIdSchema = Type.Unsafe<PluginIdBrand>(
  Type.String({
    minLength: 1,
    maxLength: MAX_CANONICAL_ID_BYTES,
    pattern: "^[a-z0-9][a-z0-9._-]*$",
  })
);

/** Identifies one plugin, skill, or other declared ownership claim. */
export const OwnershipIdentitySchema = Type.Unsafe<OwnershipIdentityBrand>(
  Refine(
    Type.String({
      minLength: 1,
      maxLength: MAX_CANONICAL_ID_BYTES,
      pattern: "^[a-z0-9@][a-z0-9@._:/-]*$",
    }),
    hasSafeSegments,
    () => "Expected a canonical ownership identity"
  )
);

/** Identifies one canonical POSIX path inside release-owned content. */
export const ReleaseRelativePathSchema = Type.Unsafe<ReleaseRelativePathBrand>(
  Refine(
    Type.String({ minLength: 1, maxLength: MAX_RELEASE_RELATIVE_PATH_BYTES }),
    isCanonicalReleaseRelativePath,
    () => "Expected a canonical POSIX release-relative path"
  )
);

/** Identifies exact source bytes by SHA-256. */
export const ContentDigestSchema = Type.Unsafe<ContentDigestBrand>(
  Type.String({ pattern: "^sha256_[0-9a-f]{64}$" })
);

/** Identifies one canonical release-input envelope. */
export const ReleaseInputDigestSchema = Type.Unsafe<ReleaseInputDigestBrand>(
  Type.String({ pattern: "^ri1_[0-9a-f]{64}$" })
);

/** Identifies one canonical plugin payload. */
export const PayloadDigestSchema = Type.Unsafe<PayloadDigestBrand>(
  Type.String({ pattern: "^pd1_[0-9a-f]{64}$" })
);

/** Identifies one canonical agent-plugin release. */
export const ReleaseDigestSchema = Type.Unsafe<ReleaseDigestBrand>(
  Type.String({ pattern: "^rd1_[0-9a-f]{64}$" })
);

/** Identifies one canonical packaged release artifact. */
export const ArtifactDigestSchema = Type.Unsafe<ArtifactDigestBrand>(
  Type.String({ pattern: "^ad1_[0-9a-f]{64}$" })
);

/** Identifies one canonical complete curated release set. */
export const ReleaseSetDigestSchema = Type.Unsafe<ReleaseSetDigestBrand>(
  Type.String({ pattern: "^rs1_[0-9a-f]{64}$" })
);

/** Admits only the two normalized executable-bit states used in release payloads. */
export const NormalizedFileModeSchema = Type.Union([Type.Literal(0o644), Type.Literal(0o755)]);

export type ContentAuthority = Static<typeof ContentAuthoritySchema>;
export type RepositoryIdentity = Static<typeof RepositoryIdentitySchema>;
export type GitCommitId = Static<typeof GitCommitIdSchema>;
export type GitTreeId = Static<typeof GitTreeIdSchema>;
export type PluginId = Static<typeof PluginIdSchema>;
export type OwnershipIdentity = Static<typeof OwnershipIdentitySchema>;
export type ReleaseRelativePath = Static<typeof ReleaseRelativePathSchema>;
export type ContentDigest = Static<typeof ContentDigestSchema>;
export type ReleaseInputDigest = Static<typeof ReleaseInputDigestSchema>;
export type PayloadDigest = Static<typeof PayloadDigestSchema>;
export type ReleaseDigest = Static<typeof ReleaseDigestSchema>;
export type ArtifactDigest = Static<typeof ArtifactDigestSchema>;
export type ReleaseSetDigest = Static<typeof ReleaseSetDigestSchema>;
export type NormalizedFileMode = Static<typeof NormalizedFileModeSchema>;

export function parseContentAuthority(
  value: unknown,
  path = "contentAuthority"
): ReleaseResult<ContentAuthority, ReleaseIssue> {
  return parseStringSchema(
    ContentAuthoritySchema,
    value,
    path,
    "INVALID_CONTENT_AUTHORITY",
    "Content authority must be canonical"
  );
}

export function parseRepositoryIdentity(
  value: unknown,
  path = "repositoryIdentity"
): ReleaseResult<RepositoryIdentity, ReleaseIssue> {
  return parseStringSchema(
    RepositoryIdentitySchema,
    value,
    path,
    "INVALID_REPOSITORY_IDENTITY",
    "Repository identity must be logical and path-safe"
  );
}

export function parseGitCommitId(
  value: unknown,
  path = "sourceCommit"
): ReleaseResult<GitCommitId, ReleaseIssue> {
  return parseStringSchema(
    GitCommitIdSchema,
    value,
    path,
    "INVALID_GIT_OBJECT_ID",
    "Invalid Git object identity"
  );
}

export function parseGitTreeId(
  value: unknown,
  path = "sourceTree"
): ReleaseResult<GitTreeId, ReleaseIssue> {
  return parseStringSchema(
    GitTreeIdSchema,
    value,
    path,
    "INVALID_GIT_OBJECT_ID",
    "Invalid Git object identity"
  );
}

export function parsePluginId(
  value: unknown,
  path = "pluginId"
): ReleaseResult<PluginId, ReleaseIssue> {
  return parseStringSchema(
    PluginIdSchema,
    value,
    path,
    "INVALID_PLUGIN_ID",
    "Invalid plugin identity"
  );
}

export function parseOwnershipIdentity(
  value: unknown,
  path = "identity"
): ReleaseResult<OwnershipIdentity, ReleaseIssue> {
  return parseStringSchema(
    OwnershipIdentitySchema,
    value,
    path,
    "INVALID_OWNERSHIP_IDENTITY",
    "Invalid ownership identity"
  );
}

export function parseReleaseRelativePath(
  value: unknown,
  path = "path"
): ReleaseResult<ReleaseRelativePath, ReleaseIssue> {
  return parseStringSchema(
    ReleaseRelativePathSchema,
    value,
    path,
    "INVALID_RELATIVE_PATH",
    "Path must be a canonical POSIX relative path"
  );
}

export function parseNormalizedFileMode(
  value: unknown,
  path = "mode"
): ReleaseResult<NormalizedFileMode, ReleaseIssue> {
  if (!Value.Check(NormalizedFileModeSchema, value)) {
    return failure([
      typeof value === "number" && Number.isSafeInteger(value)
        ? issue("INVALID_MODE", path, "File mode must be normalized to 0644 or 0755", {
            expected: "0644|0755",
            actual: value,
          })
        : issue("EXPECTED_INTEGER", path, "Value must be a safe integer"),
    ]);
  }
  return success(value);
}

export function parseContentDigest(
  value: unknown,
  path = "digest"
): ReleaseResult<ContentDigest, ReleaseIssue> {
  return parseDigest(ContentDigestSchema, value, path);
}

export function parseReleaseInputDigest(
  value: unknown,
  path = "releaseInputDigest"
): ReleaseResult<ReleaseInputDigest, ReleaseIssue> {
  return parseDigest(ReleaseInputDigestSchema, value, path);
}

export function parsePayloadDigest(
  value: unknown,
  path = "payloadDigest"
): ReleaseResult<PayloadDigest, ReleaseIssue> {
  return parseDigest(PayloadDigestSchema, value, path);
}

export function parseReleaseDigest(
  value: unknown,
  path = "releaseDigest"
): ReleaseResult<ReleaseDigest, ReleaseIssue> {
  return parseDigest(ReleaseDigestSchema, value, path);
}

export function parseArtifactDigest(
  value: unknown,
  path = "artifactDigest"
): ReleaseResult<ArtifactDigest, ReleaseIssue> {
  return parseDigest(ArtifactDigestSchema, value, path);
}

export function parseReleaseSetDigest(
  value: unknown,
  path = "releaseSetDigest"
): ReleaseResult<ReleaseSetDigest, ReleaseIssue> {
  return parseDigest(ReleaseSetDigestSchema, value, path);
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

function parseStringSchema<T extends TSchema>(
  schema: T,
  value: unknown,
  path: string,
  invalidCode: ReleaseIssueCode,
  invalidMessage: string
): ReleaseResult<Static<T>, ReleaseIssue> {
  if (Value.Check(schema, value)) return success(value);
  return failure([
    typeof value === "string"
      ? issue(invalidCode, path, invalidMessage)
      : issue("EXPECTED_STRING", path, "Value must be a string"),
  ]);
}

function parseDigest<T extends TSchema>(
  schema: T,
  value: unknown,
  path: string
): ReleaseResult<Static<T>, ReleaseIssue> {
  return parseStringSchema(
    schema,
    value,
    path,
    "INVALID_DIGEST",
    "Digest has the wrong domain or encoding"
  );
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hasSafeSegments(value: string): boolean {
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isCanonicalReleaseRelativePath(value: string): boolean {
  return (
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("\\") &&
    !value.includes(":") &&
    !CONTROL_CHARACTER_PATTERN.test(value) &&
    value.normalize("NFC") === value &&
    hasSafeSegments(value) &&
    encoder.encode(value).byteLength <= MAX_RELEASE_RELATIVE_PATH_BYTES
  );
}
