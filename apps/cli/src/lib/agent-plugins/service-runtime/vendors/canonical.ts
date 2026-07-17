import { createHash } from "node:crypto";

const encoder = new TextEncoder();

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(canonicalValue(value))}\n`);
}

export function sha256ContentDigest(bytes: Uint8Array): string {
  return `sha256_${createHash("sha256").update(bytes).digest("hex")}`;
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

export function vendorPayloadDigest(
  entries: readonly Readonly<{ path: string; mode: "100644" | "100755"; blob: string }>[],
): string {
  return sha256ContentDigest(canonicalJsonBytes(entries.map((entry) => ({
    blob: entry.blob,
    mode: entry.mode,
    path: entry.path,
  }))));
}

export function gitBlobId(bytes: Uint8Array, objectIdLength: number): string {
  const algorithm = objectIdLength === 40 ? "sha1" : objectIdLength === 64 ? "sha256" : undefined;
  if (algorithm === undefined) throw new Error("Unsupported Git object format");
  const header = encoder.encode(`blob ${bytes.byteLength}\0`);
  return createHash(algorithm).update(header).update(bytes).digest("hex");
}

function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalValue(record[key])]));
  }
  throw new Error("Canonical JSON contains an unsupported value");
}
