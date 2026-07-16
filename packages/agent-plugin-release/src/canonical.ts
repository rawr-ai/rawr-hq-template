import { Buffer } from "node:buffer";

import { issue, type ReleaseIssue } from "./issues";
import { failure, success, type ReleaseResult } from "./result";

export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

export function canonicalJsonLine(value: CanonicalJsonValue): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

export function decodeCanonicalJson(
  bytes: unknown,
  path: string,
  maxBytes: number,
): ReleaseResult<unknown, ReleaseIssue> {
  if (!(bytes instanceof Uint8Array)) {
    return failure([issue("EXPECTED_BYTES", path, "Canonical envelope must be a Uint8Array")]);
  }
  if (bytes.byteLength > maxBytes) {
    return failure([issue("ENVELOPE_TOO_LARGE", path, "Canonical envelope exceeds its protocol bound", {
      expected: maxBytes,
      actual: bytes.byteLength,
    })]);
  }
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    return failure([issue("INVALID_UTF8", path, "Canonical envelope is not valid UTF-8")]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure([issue("INVALID_JSON", path, "Canonical envelope is not valid JSON")]);
  }
  return success(parsed);
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

export function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function decodeBase64(value: unknown, path: string): ReleaseResult<Uint8Array, ReleaseIssue> {
  if (typeof value !== "string") {
    return failure([issue("EXPECTED_STRING", path, "Base64 value must be a string")]);
  }
  if (!BASE64_PATTERN.test(value)) {
    return failure([issue("INVALID_BASE64", path, "Value must use canonical padded base64")]);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    return failure([issue("INVALID_BASE64", path, "Value is not the canonical base64 representation")]);
  }
  return success(new Uint8Array(bytes));
}
