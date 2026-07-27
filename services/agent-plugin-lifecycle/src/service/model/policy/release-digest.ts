import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  type ContentDigest,
  ContentDigestSchema,
  type PayloadDigest,
  PayloadDigestSchema,
  type ReleaseDigest,
  ReleaseDigestSchema,
  type ReleaseInputDigest,
  ReleaseInputDigestSchema,
  type ReleaseSetDigest,
  ReleaseSetDigestSchema,
} from "../dto/release-digest";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { releaseIssue } from "./release-issue";
import { failure, success } from "./release-result";

/** Admits an exact content-byte digest into the release domain. */
export function parseContentDigest(
  value: unknown,
  path = "digest"
): ReleaseResult<ContentDigest, ReleaseIssue> {
  return parseDigest(ContentDigestSchema, value, path);
}

/** Admits one canonical digest-free release-input body digest into the release domain. */
export function parseReleaseInputDigest(
  value: unknown,
  path = "releaseInputDigest"
): ReleaseResult<ReleaseInputDigest, ReleaseIssue> {
  return parseDigest(ReleaseInputDigestSchema, value, path);
}

/** Admits one canonical payload-entry digest into the release domain. */
export function parsePayloadDigest(
  value: unknown,
  path = "payloadDigest"
): ReleaseResult<PayloadDigest, ReleaseIssue> {
  return parseDigest(PayloadDigestSchema, value, path);
}

/** Admits one canonical digest-free release-body digest into the release domain. */
export function parseReleaseDigest(
  value: unknown,
  path = "releaseDigest"
): ReleaseResult<ReleaseDigest, ReleaseIssue> {
  return parseDigest(ReleaseDigestSchema, value, path);
}

/** Admits one canonical digest-free complete-set body digest into the release domain. */
export function parseReleaseSetDigest(
  value: unknown,
  path = "releaseSetDigest"
): ReleaseResult<ReleaseSetDigest, ReleaseIssue> {
  return parseDigest(ReleaseSetDigestSchema, value, path);
}

/** Derives the SHA-256 identity of exact content bytes. */
export function contentDigest(bytes: Uint8Array): ContentDigest {
  return digestBytes(ContentDigestSchema, "sha256_", bytes);
}

/** Derives the verification identity of canonical digest-free release-input body bytes. */
export function releaseInputDigest(bytes: Uint8Array): ReleaseInputDigest {
  return digestBytes(ReleaseInputDigestSchema, "ri1_", bytes);
}

/** Derives the verification identity of canonical payload-entry bytes. */
export function payloadDigest(bytes: Uint8Array): PayloadDigest {
  return digestBytes(PayloadDigestSchema, "pd1_", bytes);
}

/** Derives the verification identity of canonical digest-free release-body bytes. */
export function releaseDigest(bytes: Uint8Array): ReleaseDigest {
  return digestBytes(ReleaseDigestSchema, "rd1_", bytes);
}

/** Derives the verification identity of canonical digest-free complete-set body bytes. */
export function releaseSetDigest(bytes: Uint8Array): ReleaseSetDigest {
  return digestBytes(ReleaseSetDigestSchema, "rs1_", bytes);
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

function digestBytes<T extends TSchema>(schema: T, prefix: string, bytes: Uint8Array): Static<T> {
  const candidate = `${prefix}${sha256Hex(bytes)}`;
  if (Value.Check(schema, candidate)) return candidate;
  throw new Error("Constructed digest did not satisfy its TypeBox schema");
}

function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}
