import { createHash } from "node:crypto";

import type {
  CapsuleActionDigest,
  CapsuleDigest,
  CapsuleStateDigest,
} from "./contract";

const encoder = new TextEncoder();

export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | Readonly<{ [key: string]: CanonicalJsonValue }>;

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(canonicalize(value))}\n`);
}

export function parseCanonicalJsonBytes(bytes: Uint8Array): CanonicalJsonValue {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) {
    throw new Error("canonical JSON must contain exactly one trailing LF");
  }
  const parsed: unknown = JSON.parse(text.slice(0, -1));
  const canonical = canonicalJsonBytes(parsed);
  if (!bytesEqual(bytes, canonical)) throw new Error("JSON bytes are not canonical");
  return canonicalize(parsed);
}

export function capsuleStateDigest(value: unknown): CapsuleStateDigest {
  return taggedDigest("cs1_", canonicalJsonBytes(value)) as CapsuleStateDigest;
}

export function committedCapsuleDigest(value: unknown): CapsuleDigest {
  return taggedDigest("cc1_", canonicalJsonBytes(value)) as CapsuleDigest;
}

export function ownerActionDigest(value: unknown): CapsuleActionDigest {
  return taggedDigest("ca1_", canonicalJsonBytes(value)) as CapsuleActionDigest;
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let mismatch = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    mismatch |= left[index]! ^ right[index]!;
  }
  return mismatch === 0;
}

export function compareCanonicalText(left: string, right: string): number {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.byteLength, rightBytes.byteLength);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.byteLength - rightBytes.byteLength;
}

function canonicalize(value: unknown, path = "$", seen = new Set<object>()): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`${path} must be a safe integer`);
    return value;
  }
  if (typeof value !== "object") throw new Error(`${path} is not canonical JSON data`);
  if (seen.has(value)) throw new Error(`${path} contains a cycle`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(value.map((entry, index) => canonicalize(entry, `${path}[${index}]`, seen)));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${path} must be a plain object`);
    }
    const record = value as Record<string, unknown>;
    const result: Record<string, CanonicalJsonValue> = {};
    for (const key of Object.keys(record).sort(compareCanonicalText)) {
      if (key.length === 0 || key.includes("\0")) throw new Error(`${path} has an invalid key`);
      result[key] = canonicalize(record[key], `${path}.${key}`, seen);
    }
    return Object.freeze(result);
  } finally {
    seen.delete(value);
  }
}

function taggedDigest(prefix: string, bytes: Uint8Array): string {
  return `${prefix}${createHash("sha256").update(bytes).digest("hex")}`;
}
