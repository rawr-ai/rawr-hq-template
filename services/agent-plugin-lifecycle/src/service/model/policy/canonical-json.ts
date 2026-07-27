import type { CanonicalJsonValue } from "../dto/canonical-json";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { releaseIssue } from "./release-issue";
import { failure, success } from "./release-result";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

/**
 * Encodes one serializer-admissible value as JSON terminated by exactly one line feed.
 *
 * @param value JSON value whose established property order defines the encoded bytes.
 * @returns UTF-8 bytes for the JSON text and its terminating line feed.
 */
export function canonicalJsonLine(value: CanonicalJsonValue): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

/**
 * Decodes a bounded canonical JSON envelope without assigning domain meaning to its value.
 *
 * Concrete record policy remains responsible for schema validation and for
 * comparing the decoded record with its canonical serialized bytes.
 *
 * @param bytes Candidate envelope bytes supplied by a caller or persisted record.
 * @param path Diagnostic location associated with the candidate envelope.
 * @param maxBytes Maximum admitted envelope size in bytes.
 * @returns The decoded JSON value or one bounded release diagnostic.
 */
export function decodeCanonicalJson(
  bytes: unknown,
  path: string,
  maxBytes: number
): ReleaseResult<unknown, ReleaseIssue> {
  if (!(bytes instanceof Uint8Array)) {
    return failure([
      releaseIssue("EXPECTED_BYTES", path, "Canonical envelope must be a Uint8Array"),
    ]);
  }
  if (bytes.byteLength > maxBytes) {
    return failure([
      releaseIssue("ENVELOPE_TOO_LARGE", path, "Canonical envelope exceeds its protocol bound", {
        expected: maxBytes,
        actual: bytes.byteLength,
      }),
    ]);
  }
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    return failure([releaseIssue("INVALID_UTF8", path, "Canonical envelope is not valid UTF-8")]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure([releaseIssue("INVALID_JSON", path, "Canonical envelope is not valid JSON")]);
  }
  return success(parsed);
}
