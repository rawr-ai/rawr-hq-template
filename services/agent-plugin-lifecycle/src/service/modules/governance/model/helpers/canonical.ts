import { createHash } from "node:crypto";

import { failure, success, type PromotionResult } from "../errors/promotion-result";

export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

export const MAX_PROMOTION_ENVELOPE_BYTES = 2 * 1024 * 1024;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function canonicalJsonLine(value: CanonicalJsonValue): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

export function sha256Digest(prefix: string, bytes: Uint8Array): string {
  return `${prefix}${createHash("sha256").update(bytes).digest("hex")}`;
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

export function decodeCanonicalJson(
  bytes: unknown,
  path: string,
): PromotionResult<unknown> {
  if (!(bytes instanceof Uint8Array)) {
    return failure("INVALID_SCHEMA", path, "Canonical record must be provided as bytes");
  }
  if (bytes.byteLength > MAX_PROMOTION_ENVELOPE_BYTES) {
    return failure("ENVELOPE_TOO_LARGE", path, "Canonical record exceeds the protocol byte limit");
  }
  try {
    return success(JSON.parse(decoder.decode(bytes)) as unknown);
  } catch {
    return failure("INVALID_SCHEMA", path, "Canonical record is not valid UTF-8 JSON");
  }
}

export function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function isCanonicalOrder<T>(
  values: readonly T[],
  identity: (value: T) => string,
): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (compareCanonicalText(identity(values[index - 1]!), identity(values[index]!)) >= 0) return false;
  }
  return true;
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
