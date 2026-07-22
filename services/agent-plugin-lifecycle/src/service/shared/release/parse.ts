import { issue, type ReleaseIssue, type ReleaseIssueCode } from "./issues";
import type { ReleaseResult } from "./result";

const encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export function isExactRecord(
  value: unknown,
  keys: readonly string[],
  path: string,
  issues: ReleaseIssue[]
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue("EXPECTED_OBJECT", path, "Value must be an object"));
    return false;
  }
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key))
      issues.push(
        issue("UNKNOWN_FIELD", `${path}.${key}`, "Field is not part of the closed schema")
      );
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key))
      issues.push(issue("UNKNOWN_FIELD", `${path}.${key}`, "Required field is missing"));
  }
  return true;
}

export function parseBoundedArray(
  value: unknown,
  path: string,
  limit: number,
  issues: ReleaseIssue[]
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(issue("EXPECTED_ARRAY", path, "Value must be an array"));
    return undefined;
  }
  if (value.length > limit) {
    issues.push(
      issue("COUNT_LIMIT_EXCEEDED", path, `Array exceeds protocol limit ${limit}`, {
        expected: limit,
        actual: value.length,
      })
    );
  }
  return value.slice(0, limit);
}

export function parseCanonicalString(
  value: unknown,
  path: string,
  issues: ReleaseIssue[],
  options: {
    readonly code?: ReleaseIssueCode;
    readonly minBytes?: number;
    readonly maxBytes: number;
    readonly pattern?: RegExp;
  }
): string | undefined {
  if (typeof value !== "string") {
    issues.push(issue("EXPECTED_STRING", path, "Value must be a string"));
    return undefined;
  }
  const byteLength = encoder.encode(value).byteLength;
  const minBytes = options.minBytes ?? 1;
  if (
    byteLength < minBytes ||
    byteLength > options.maxBytes ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    value.normalize("NFC") !== value ||
    (options.pattern !== undefined && !options.pattern.test(value))
  ) {
    issues.push(
      issue(
        options.code ?? "INVALID_STRING",
        path,
        `Value must be canonical UTF-8 between ${minBytes} and ${options.maxBytes} bytes`
      )
    );
    return undefined;
  }
  return value;
}

export function parseInteger(
  value: unknown,
  path: string,
  issues: ReleaseIssue[]
): number | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push(issue("EXPECTED_INTEGER", path, "Value must be a safe integer"));
    return undefined;
  }
  return value;
}

export function collect<T, E>(result: ReleaseResult<T, E>, issues: E[]): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}
