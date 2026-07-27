import { createHash } from "node:crypto";

import { type Static, type TSchema, Type } from "typebox";
import { Value } from "typebox/value";

import type { ReleaseIssue } from "../../model/dto/release-issue";
import type { ReleaseResult } from "../../model/dto/release-result";
import { releaseIssue } from "../../model/policy/release-issue";
import { failure, success } from "../../model/policy/release-result";

declare const contentDigestBrand: unique symbol;
declare const releaseInputDigestBrand: unique symbol;
declare const payloadDigestBrand: unique symbol;
declare const releaseDigestBrand: unique symbol;
declare const releaseSetDigestBrand: unique symbol;

type ContentDigestBrand = string & { readonly [contentDigestBrand]: "ContentDigest" };
type ReleaseInputDigestBrand = string & {
  readonly [releaseInputDigestBrand]: "ReleaseInputDigest";
};
type PayloadDigestBrand = string & { readonly [payloadDigestBrand]: "PayloadDigest" };
type ReleaseDigestBrand = string & { readonly [releaseDigestBrand]: "ReleaseDigest" };
type ReleaseSetDigestBrand = string & { readonly [releaseSetDigestBrand]: "ReleaseSetDigest" };

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

/** Identifies one canonical complete curated release set. */
export const ReleaseSetDigestSchema = Type.Unsafe<ReleaseSetDigestBrand>(
  Type.String({ pattern: "^rs1_[0-9a-f]{64}$" })
);

export type ContentDigest = Static<typeof ContentDigestSchema>;
export type ReleaseInputDigest = Static<typeof ReleaseInputDigestSchema>;
export type PayloadDigest = Static<typeof PayloadDigestSchema>;
export type ReleaseDigest = Static<typeof ReleaseDigestSchema>;
export type ReleaseSetDigest = Static<typeof ReleaseSetDigestSchema>;

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

export function releaseSetDigest(bytes: Uint8Array): ReleaseSetDigest {
  return `rs1_${sha256Hex(bytes)}` as ReleaseSetDigest;
}

function parseDigest<T extends TSchema>(
  schema: T,
  value: unknown,
  path: string
): ReleaseResult<Static<T>, ReleaseIssue> {
  if (Value.Check(schema, value)) return success(value);
  return failure([
    typeof value === "string"
      ? releaseIssue("INVALID_DIGEST", path, "Digest has the wrong domain or encoding")
      : releaseIssue("EXPECTED_STRING", path, "Value must be a string"),
  ]);
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
