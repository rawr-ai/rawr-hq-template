import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function jsonLine(value: JsonValue): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

export function decodeJson(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes));
}

export function sha256(prefix: string, bytes: Uint8Array): string {
  return `${prefix}${createHash("sha256").update(bytes).digest("hex")}`;
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function decodeBase64(value: string): Uint8Array {
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new Error("Noncanonical base64");
  return new Uint8Array(bytes);
}
