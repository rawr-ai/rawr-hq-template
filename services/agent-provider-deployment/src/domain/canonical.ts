import { createHash } from "node:crypto";

export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

const encoder = new TextEncoder();

export function canonicalBytes(value: CanonicalValue): Uint8Array {
  return encoder.encode(`${JSON.stringify(sortCanonical(value))}\n`);
}

export function canonicalDigest(prefix: string, value: CanonicalValue): string {
  return `${prefix}${createHash("sha256").update(canonicalBytes(value)).digest("hex")}`;
}

export function byteDigest(bytes: Uint8Array): string {
  return `sha256_${createHash("sha256").update(bytes).digest("hex")}`;
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

export function compareCanonical(left: string, right: string): number {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.length - rightBytes.length;
}

function sortCanonical(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value === null || typeof value !== "object") return value;
  if (!isCanonicalRecord(value)) return value;
  const sorted: Record<string, CanonicalValue> = {};
  for (const key of Object.keys(value).sort(compareCanonical)) {
    const child = value[key];
    if (child !== undefined) sorted[key] = sortCanonical(child);
  }
  return sorted;
}

function isCanonicalRecord(value: CanonicalValue): value is { readonly [key: string]: CanonicalValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
