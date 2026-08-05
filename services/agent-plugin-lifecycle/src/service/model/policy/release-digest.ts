import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
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
  return parseDigest(value, path, isContentDigest);
}

/** Admits one canonical digest-free release-input body digest into the release domain. */
export function parseReleaseInputDigest(
  value: unknown,
  path = "releaseInputDigest"
): ReleaseResult<ReleaseInputDigest, ReleaseIssue> {
  return parseDigest(value, path, isReleaseInputDigest);
}

/** Admits one canonical payload-entry digest into the release domain. */
export function parsePayloadDigest(
  value: unknown,
  path = "payloadDigest"
): ReleaseResult<PayloadDigest, ReleaseIssue> {
  return parseDigest(value, path, isPayloadDigest);
}

/** Admits one canonical digest-free release-body digest into the release domain. */
export function parseReleaseDigest(
  value: unknown,
  path = "releaseDigest"
): ReleaseResult<ReleaseDigest, ReleaseIssue> {
  return parseDigest(value, path, isReleaseDigest);
}

/** Admits one canonical digest-free complete-set body digest into the release domain. */
export function parseReleaseSetDigest(
  value: unknown,
  path = "releaseSetDigest"
): ReleaseResult<ReleaseSetDigest, ReleaseIssue> {
  return parseDigest(value, path, isReleaseSetDigest);
}

/** Derives the SHA-256 identity of exact content bytes. */
export function contentDigest(bytes: Uint8Array): ContentDigest {
  return digestBytes("sha256_", bytes, isContentDigest);
}

/** Derives the verification identity of canonical digest-free release-input body bytes. */
export function releaseInputDigest(bytes: Uint8Array): ReleaseInputDigest {
  return digestBytes("ri1_", bytes, isReleaseInputDigest);
}

/** Derives the verification identity of canonical payload-entry bytes. */
export function payloadDigest(bytes: Uint8Array): PayloadDigest {
  return digestBytes("pd1_", bytes, isPayloadDigest);
}

/** Derives the verification identity of canonical digest-free release-body bytes. */
export function releaseDigest(bytes: Uint8Array): ReleaseDigest {
  return digestBytes("rd1_", bytes, isReleaseDigest);
}

/** Derives the verification identity of canonical digest-free complete-set body bytes. */
export function releaseSetDigest(bytes: Uint8Array): ReleaseSetDigest {
  return digestBytes("rs1_", bytes, isReleaseSetDigest);
}

function parseDigest<T extends string>(
  value: unknown,
  path: string,
  admits: (value: string) => value is T
): ReleaseResult<T, ReleaseIssue> {
  if (typeof value === "string" && admits(value)) return success(value);
  return failure([
    typeof value === "string"
      ? releaseIssue("INVALID_DIGEST", path, "Digest has the wrong domain or encoding")
      : releaseIssue("EXPECTED_STRING", path, "Value must be a string"),
  ]);
}

function digestBytes<T extends string>(
  prefix: string,
  bytes: Uint8Array,
  admits: (value: string) => value is T
): T {
  const candidate = `${prefix}${sha256Hex(bytes)}`;
  if (admits(candidate)) return candidate;
  throw new Error("Constructed digest did not satisfy its TypeBox schema");
}

function isContentDigest(value: string): value is ContentDigest {
  return Value.Check(ContentDigestSchema, value);
}

function isReleaseInputDigest(value: string): value is ReleaseInputDigest {
  return Value.Check(ReleaseInputDigestSchema, value);
}

function isPayloadDigest(value: string): value is PayloadDigest {
  return Value.Check(PayloadDigestSchema, value);
}

function isReleaseDigest(value: string): value is ReleaseDigest {
  return Value.Check(ReleaseDigestSchema, value);
}

function isReleaseSetDigest(value: string): value is ReleaseSetDigest {
  return Value.Check(ReleaseSetDigestSchema, value);
}

function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}
