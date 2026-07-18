import { issue, type ProviderDeploymentIssue } from "../errors/deployment-result";

const encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export function exactRecord(
  value: unknown,
  keys: readonly string[],
  path: string,
  issues: ProviderDeploymentIssue[],
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue("EXPECTED_OBJECT", path, "Value must be a closed object"));
    return false;
  }
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      issues.push(issue("UNKNOWN_FIELD", `${path}.${key}`, "Field is not part of the closed schema"));
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      issues.push(issue("MISSING_FIELD", `${path}.${key}`, "Required field is missing"));
    }
  }
  return true;
}

export function boundedArray(
  value: unknown,
  path: string,
  limit: number,
  issues: ProviderDeploymentIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(issue("EXPECTED_ARRAY", path, "Value must be an array"));
    return undefined;
  }
  if (value.length === 0 || value.length > limit) {
    issues.push(issue("EXPECTED_ARRAY", path, `Array must contain between 1 and ${limit} entries`, `1..${limit}`, String(value.length)));
    return undefined;
  }
  return value;
}

export function canonicalString(
  value: unknown,
  path: string,
  issues: ProviderDeploymentIssue[],
  options: Readonly<{ maxBytes: number; pattern: RegExp; code?: "INVALID_DIGEST" | "INVALID_EVALUATION_PROFILE" | "INVALID_PROTOCOL" | "INVALID_PLUGIN_ID" | "INVALID_LOCATOR" }>,
): string | undefined {
  if (typeof value !== "string") {
    issues.push(issue("EXPECTED_STRING", path, "Value must be a string"));
    return undefined;
  }
  if (
    value.length === 0
    || value.normalize("NFC") !== value
    || CONTROL_CHARACTER_PATTERN.test(value)
    || encoder.encode(value).byteLength > options.maxBytes
    || !options.pattern.test(value)
  ) {
    issues.push(issue(options.code ?? "EXPECTED_STRING", path, "Value is not in canonical form", options.pattern.source, value));
    return undefined;
  }
  return value;
}

export function safeInteger(
  value: unknown,
  path: string,
  issues: ProviderDeploymentIssue[],
  minimum: number,
): number | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    issues.push(issue("EXPECTED_INTEGER", path, `Value must be a safe integer >= ${minimum}`, String(minimum), String(value)));
    return undefined;
  }
  return value;
}
