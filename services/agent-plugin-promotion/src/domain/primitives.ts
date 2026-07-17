import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseInputDigest,
  parseReleaseRelativePath,
  parseReleaseSetDigest,
  parseRepositoryIdentity,
  type ContentAuthority,
  type GitCommitId,
  type GitTreeId,
  type ReleaseInputDigest,
  type ReleaseRelativePath,
  type ReleaseSetDigest,
  type RepositoryIdentity,
} from "@rawr/agent-plugin-release";

import { compareCanonicalText } from "./canonical";
import { failure, success, type PromotionResult } from "./result";

declare const canonicalIdBrand: unique symbol;
declare const canonicalRefBrand: unique symbol;
declare const gitBlobIdBrand: unique symbol;
declare const mechanicalEvidenceDigestBrand: unique symbol;
declare const acceptanceRequestDigestBrand: unique symbol;
declare const acceptanceEvidenceDigestBrand: unique symbol;
declare const lifecyclePolicyDigestBrand: unique symbol;
declare const promotionAttestationDigestBrand: unique symbol;
declare const currentMainDigestBrand: unique symbol;
declare const providerProjectionDigestBrand: unique symbol;
declare const capabilityProfileDigestBrand: unique symbol;
declare const targetIdentityDigestBrand: unique symbol;
declare const mechanicalTargetFactDigestBrand: unique symbol;

export type CanonicalId = string & { readonly [canonicalIdBrand]: "CanonicalId" };
export type CanonicalRef = string & { readonly [canonicalRefBrand]: "CanonicalRef" };
export type GitBlobId = string & { readonly [gitBlobIdBrand]: "GitBlobId" };
export type MechanicalEvidenceDigest = string & {
  readonly [mechanicalEvidenceDigestBrand]: "MechanicalEvidenceDigest";
};
export type AcceptanceRequestDigest = string & {
  readonly [acceptanceRequestDigestBrand]: "AcceptanceRequestDigest";
};
export type AcceptanceEvidenceDigest = string & {
  readonly [acceptanceEvidenceDigestBrand]: "AcceptanceEvidenceDigest";
};
export type LifecyclePolicyDigest = string & {
  readonly [lifecyclePolicyDigestBrand]: "LifecyclePolicyDigest";
};
export type PromotionAttestationDigest = string & {
  readonly [promotionAttestationDigestBrand]: "PromotionAttestationDigest";
};
export type CurrentMainDigest = string & {
  readonly [currentMainDigestBrand]: "CurrentMainDigest";
};
export type ProviderProjectionDigest = string & {
  readonly [providerProjectionDigestBrand]: "ProviderProjectionDigest";
};
export type CapabilityProfileDigest = string & {
  readonly [capabilityProfileDigestBrand]: "CapabilityProfileDigest";
};
export type TargetIdentityDigest = string & {
  readonly [targetIdentityDigestBrand]: "TargetIdentityDigest";
};
export type MechanicalTargetFactDigest = string & {
  readonly [mechanicalTargetFactDigestBrand]: "MechanicalTargetFactDigest";
};

export type {
  ContentAuthority,
  GitCommitId,
  GitTreeId,
  ReleaseInputDigest,
  ReleaseRelativePath,
  ReleaseSetDigest,
  RepositoryIdentity,
};

export const INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL =
  "independent-agent-plugin-acceptance/v1" as const;
export const MECHANICAL_EVIDENCE_PROTOCOL = "agent-plugin-mechanical-evidence/v1" as const;
export const CURRENT_MAIN_CHANNEL = "current-main" as const;
export const LIFECYCLE_POLICY_PATH = "plugins/agents/.lifecycle/policy.json" as const;
export const ACCEPTANCE_ROOT = "plugins/agents/.lifecycle/acceptances" as const;
export const PROMOTION_ROOT = "plugins/agents/.lifecycle/promotions" as const;
export const CURRENT_MAIN_PATH = "plugins/agents/.lifecycle/channels/current-main.json" as const;
export const MAX_BINDINGS = 128;
export const MAX_CANONICAL_ID_BYTES = 512;
export const MAX_MECHANICAL_EVIDENCE_BYTES = 64 * 1024 * 1024;

const encoder = new TextEncoder();
const CANONICAL_ID_PATTERN = /^[a-z0-9][a-z0-9._:@/+\-]*$/u;
const REF_PATTERN = /^refs\/(?:heads|tags)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const GIT_OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export function parseCanonicalId(value: unknown, path: string): PromotionResult<CanonicalId> {
  if (
    typeof value !== "string"
    || value.normalize("NFC") !== value
    || encoder.encode(value).byteLength > MAX_CANONICAL_ID_BYTES
    || !CANONICAL_ID_PATTERN.test(value)
    || hasUnsafeSegments(value)
  ) {
    return failure("INVALID_CANONICAL_VALUE", path, "Expected a bounded canonical identity");
  }
  return success(value as CanonicalId);
}

export function parseCanonicalRef(value: unknown, path: string): PromotionResult<CanonicalRef> {
  if (
    typeof value !== "string"
    || !REF_PATTERN.test(value)
    || value.includes("..")
    || value.includes("//")
    || value.endsWith(".lock")
    || value.endsWith("/")
  ) {
    return failure("INVALID_GIT_IDENTITY", path, "Expected a qualified canonical Git ref");
  }
  return success(value as CanonicalRef);
}

export function parseGitBlobId(value: unknown, path: string): PromotionResult<GitBlobId> {
  return typeof value === "string" && GIT_OBJECT_PATTERN.test(value)
    ? success(value as GitBlobId)
    : failure("INVALID_GIT_IDENTITY", path, "Expected an exact Git blob object ID");
}

export function parseIsoInstant(value: unknown, path: string): PromotionResult<string> {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value)) {
    return failure("INVALID_CANONICAL_VALUE", path, "Expected a canonical UTC instant");
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value
    ? failure("INVALID_CANONICAL_VALUE", path, "Expected a real canonical UTC instant")
    : success(value);
}

export function parseRepository(value: unknown, path: string): PromotionResult<RepositoryIdentity> {
  return fromReleaseParser(parseRepositoryIdentity(value, path), path);
}

export function parseAuthority(value: unknown, path: string): PromotionResult<ContentAuthority> {
  return fromReleaseParser(parseContentAuthority(value, path), path);
}

export function parseCommit(value: unknown, path: string): PromotionResult<GitCommitId> {
  return fromReleaseParser(parseGitCommitId(value, path), path);
}

export function parseTree(value: unknown, path: string): PromotionResult<GitTreeId> {
  return fromReleaseParser(parseGitTreeId(value, path), path);
}

export function parseRelativePath(value: unknown, path: string): PromotionResult<ReleaseRelativePath> {
  return fromReleaseParser(parseReleaseRelativePath(value, path), path);
}

export function parseReleaseInput(value: unknown, path: string): PromotionResult<ReleaseInputDigest> {
  return fromReleaseParser(parseReleaseInputDigest(value, path), path);
}

export function parseReleaseSet(value: unknown, path: string): PromotionResult<ReleaseSetDigest> {
  return fromReleaseParser(parseReleaseSetDigest(value, path), path);
}

export function parseMechanicalEvidenceDigest(
  value: unknown,
  path: string,
): PromotionResult<MechanicalEvidenceDigest> {
  return parseDigest(value, "me1_", path, (text) => text as MechanicalEvidenceDigest);
}

export function parseAcceptanceRequestDigest(
  value: unknown,
  path: string,
): PromotionResult<AcceptanceRequestDigest> {
  return parseDigest(value, "arq1_", path, (text) => text as AcceptanceRequestDigest);
}

export function parseAcceptanceEvidenceDigest(
  value: unknown,
  path: string,
): PromotionResult<AcceptanceEvidenceDigest> {
  return parseDigest(value, "ace1_", path, (text) => text as AcceptanceEvidenceDigest);
}

export function parseLifecyclePolicyDigest(
  value: unknown,
  path: string,
): PromotionResult<LifecyclePolicyDigest> {
  return parseDigest(value, "lpy1_", path, (text) => text as LifecyclePolicyDigest);
}

export function parsePromotionAttestationDigest(
  value: unknown,
  path: string,
): PromotionResult<PromotionAttestationDigest> {
  return parseDigest(value, "pat1_", path, (text) => text as PromotionAttestationDigest);
}

export function parseCurrentMainDigest(
  value: unknown,
  path: string,
): PromotionResult<CurrentMainDigest> {
  return parseDigest(value, "cm1_", path, (text) => text as CurrentMainDigest);
}

export function parseProjectionDigest(
  value: unknown,
  path: string,
): PromotionResult<ProviderProjectionDigest> {
  return parseDigest(value, "ap1_", path, (text) => text as ProviderProjectionDigest);
}

export function parseCapabilityDigest(
  value: unknown,
  path: string,
): PromotionResult<CapabilityProfileDigest> {
  return parseDigest(value, "cp1_", path, (text) => text as CapabilityProfileDigest);
}

export function parseTargetDigest(
  value: unknown,
  path: string,
): PromotionResult<TargetIdentityDigest> {
  return parseDigest(value, "pt1_", path, (text) => text as TargetIdentityDigest);
}

export function parseMechanicalTargetFactDigest(
  value: unknown,
  path: string,
): PromotionResult<MechanicalTargetFactDigest> {
  return parseDigest(value, "mtf1_", path, (text) => text as MechanicalTargetFactDigest);
}

export function canonicalBindingKey(parts: readonly string[]): string {
  return parts.join("\u0000");
}

export function sortCanonical<T>(values: readonly T[], identity: (value: T) => string): readonly T[] {
  return Object.freeze([...values].sort((left, right) => compareCanonicalText(identity(left), identity(right))));
}

function parseDigest<T extends string>(
  value: unknown,
  prefix: string,
  path: string,
  brand: (value: string) => T,
): PromotionResult<T> {
  const pattern = new RegExp(`^${prefix}[0-9a-f]{64}$`, "u");
  return typeof value === "string" && pattern.test(value)
    ? success(brand(value))
    : failure("INVALID_DIGEST", path, `Expected a ${prefix} digest`);
}

function fromReleaseParser<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
  path: string,
): PromotionResult<T> {
  return result.ok
    ? success(result.value)
    : failure("INVALID_CANONICAL_VALUE", path, "Value violates the release-domain canonical contract");
}

function hasUnsafeSegments(value: string): boolean {
  return value.split("/").some((segment) => segment === "." || segment === "..");
}
