import type { TObject } from "typebox";
import { Value } from "typebox/value";

import type { ReleaseIssue, ReleaseIssueCode } from "../dto/release-issue";
import { releaseIssue } from "./release-issue";

const encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

/**
 * Admits only the root membership of one closed TypeBox record.
 *
 * Plain objects are projected to their enumerable key presence before schema
 * evaluation, so aggregate admission never traverses caller-owned field values.
 *
 * @param schema Owning TypeBox object schema whose properties define exact membership.
 * @param value Raw candidate to inspect without traversing its field values.
 * @param path Base path used for the aggregate structural diagnostic.
 * @param issues Ordered destination for the aggregate admission diagnostic.
 * @returns Whether the value has the exact root shape required for traversal.
 */
export function admitTypeBoxRecordForTraversal(
  schema: TObject,
  value: unknown,
  path: string,
  issues: ReleaseIssue[]
): value is Record<string, unknown> {
  const projection =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.keys(value).map((key) => [key, undefined]))
      : value;
  const rootError = Value.Errors(schema, projection).find(
    ({ instancePath }) => instancePath === ""
  );
  if (rootError === undefined) return true;
  issues.push(
    rootError.keyword === "type"
      ? releaseIssue("EXPECTED_OBJECT", path, "Value must be an object")
      : releaseIssue(
          "UNKNOWN_FIELD",
          path,
          `Expected exactly: ${Object.keys(schema.properties).sort().join(", ")}`
        )
  );
  return false;
}

/**
 * Admits a raw array for bounded traversal.
 *
 * An over-limit array contributes one diagnostic and yields only its bounded
 * prefix, preserving the established traversal ceiling.
 *
 * @param value Raw value to inspect.
 * @param path Path used for array-shape and count diagnostics.
 * @param limit Maximum number of values admitted for traversal.
 * @param issues Ordered destination for admission diagnostics.
 * @returns The bounded array prefix, or `undefined` when the value is not an array.
 */
export function parseBoundedArray(
  value: unknown,
  path: string,
  limit: number,
  issues: ReleaseIssue[]
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(releaseIssue("EXPECTED_ARRAY", path, "Value must be an array"));
    return undefined;
  }
  if (value.length > limit) {
    issues.push(
      releaseIssue("COUNT_LIMIT_EXCEEDED", path, `Array exceeds protocol limit ${limit}`, {
        expected: limit,
        actual: value.length,
      })
    );
  }
  return value.slice(0, limit);
}

/**
 * Admits a string that satisfies canonical text and caller-owned field policy.
 *
 * Admission enforces UTF-8 byte bounds, NFC normalization, control-character
 * exclusion, and an optional pattern without replacing structural schema
 * authority.
 *
 * @param value Raw value to inspect.
 * @param path Path used for string-shape and canonicality diagnostics.
 * @param issues Ordered destination for admission diagnostics.
 * @param options Byte bounds plus optional diagnostic-code and pattern constraints.
 * @returns The original admitted string, or `undefined` after a diagnostic.
 */
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
    issues.push(releaseIssue("EXPECTED_STRING", path, "Value must be a string"));
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
      releaseIssue(
        options.code ?? "INVALID_STRING",
        path,
        `Value must be canonical UTF-8 between ${minBytes} and ${options.maxBytes} bytes`
      )
    );
    return undefined;
  }
  return value;
}

/**
 * Admits a raw value only when it is a JavaScript safe integer.
 *
 * @param value Raw value to inspect.
 * @param path Path used for the integer diagnostic.
 * @param issues Ordered destination for admission diagnostics.
 * @returns The admitted number, or `undefined` after a diagnostic.
 */
export function parseInteger(
  value: unknown,
  path: string,
  issues: ReleaseIssue[]
): number | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push(releaseIssue("EXPECTED_INTEGER", path, "Value must be a safe integer"));
    return undefined;
  }
  return value;
}
