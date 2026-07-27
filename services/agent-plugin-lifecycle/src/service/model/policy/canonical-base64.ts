import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { releaseIssue } from "./release-issue";
import { failure, success } from "./release-result";

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const BASE64_CHUNK_LENGTH = 8_192;
const base64Values = new Int16Array(128).fill(-1);
for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
  base64Values[BASE64_ALPHABET.charCodeAt(index)] = index;
}

/**
 * Encodes payload bytes using the lifecycle protocol's canonical padded base64 form.
 *
 * @param bytes Payload bytes to encode without mutation.
 * @returns Canonical padded base64 text.
 */
export function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let chunk = "";
  for (let index = 0; index < bytes.byteLength; index += 3) {
    const first = bytes[index]!;
    const hasSecond = index + 1 < bytes.byteLength;
    const hasThird = index + 2 < bytes.byteLength;
    const second = hasSecond ? bytes[index + 1]! : 0;
    const third = hasThird ? bytes[index + 2]! : 0;
    chunk += BASE64_ALPHABET[first >>> 2]!;
    chunk += BASE64_ALPHABET[((first & 0x03) << 4) | (second >>> 4)]!;
    chunk += hasSecond ? BASE64_ALPHABET[((second & 0x0f) << 2) | (third >>> 6)]! : "=";
    chunk += hasThird ? BASE64_ALPHABET[third & 0x3f]! : "=";
    if (chunk.length >= BASE64_CHUNK_LENGTH) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks.join("");
}

/**
 * Decodes only canonical padded base64 into payload bytes.
 *
 * Structural alphabet and padding failures remain distinguishable in their
 * diagnostic message from values whose unused trailing bits are noncanonical.
 *
 * @param value Candidate base64 value supplied by a persisted release record.
 * @param path Diagnostic location associated with the candidate value.
 * @returns Decoded bytes or one bounded release diagnostic.
 */
export function decodeBase64(
  value: unknown,
  path: string
): ReleaseResult<Uint8Array, ReleaseIssue> {
  if (typeof value !== "string") {
    return failure([releaseIssue("EXPECTED_STRING", path, "Base64 value must be a string")]);
  }
  if (!BASE64_PATTERN.test(value)) {
    return failure([
      releaseIssue("INVALID_BASE64", path, "Value must use canonical padded base64"),
    ]);
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((value.length / 4) * 3 - padding);
  let outputIndex = 0;
  for (let index = 0; index < value.length; index += 4) {
    const first = base64Value(value, index);
    const second = base64Value(value, index + 1);
    const third = value[index + 2] === "=" ? 0 : base64Value(value, index + 2);
    const fourth = value[index + 3] === "=" ? 0 : base64Value(value, index + 3);
    bytes[outputIndex] = (first << 2) | (second >>> 4);
    outputIndex += 1;
    if (outputIndex < bytes.length) {
      bytes[outputIndex] = ((second & 0x0f) << 4) | (third >>> 2);
      outputIndex += 1;
    }
    if (outputIndex < bytes.length) {
      bytes[outputIndex] = ((third & 0x03) << 6) | fourth;
      outputIndex += 1;
    }
  }
  if (encodeBase64(bytes) !== value) {
    return failure([
      releaseIssue("INVALID_BASE64", path, "Value is not the canonical base64 representation"),
    ]);
  }
  return success(bytes);
}

function base64Value(value: string, index: number): number {
  const code = value.charCodeAt(index);
  return code < base64Values.length ? base64Values[code]! : -1;
}
