import { describe, expect, it } from "vitest";

import type { ReleaseIssue } from "../../src/service/model/dto/release-issue";
import {
  admitClosedRecordForTraversal,
  parseBoundedArray,
  parseCanonicalString,
  parseInteger,
} from "../../src/service/model/policy/release-value-admission";

describe("release value admission", () => {
  it("reports unknown fields before missing fields in exact record traversal order", () => {
    const issues: ReleaseIssue[] = [];

    expect(admitClosedRecordForTraversal({ extra: true }, ["required"], "record", issues)).toBe(
      true
    );
    expect(issues).toEqual([
      {
        code: "UNKNOWN_FIELD",
        path: "record.extra",
        message: "Field is not part of the closed schema",
      },
      {
        code: "UNKNOWN_FIELD",
        path: "record.required",
        message: "Required field is missing",
      },
    ]);
  });

  it("returns the bounded array prefix and one exact over-limit issue", () => {
    const issues: ReleaseIssue[] = [];

    expect(parseBoundedArray(["first", "second", "third"], "members", 2, issues)).toEqual([
      "first",
      "second",
    ]);
    expect(issues).toEqual([
      {
        code: "COUNT_LIMIT_EXCEEDED",
        path: "members",
        message: "Array exceeds protocol limit 2",
        expected: 2,
        actual: 3,
      },
    ]);
  });

  it("admits canonical UTF-8 strings and safe integers with their existing diagnostics", () => {
    const issues: ReleaseIssue[] = [];

    expect(
      parseCanonicalString("\u00e9", "protocol", issues, {
        minBytes: 2,
        maxBytes: 2,
        pattern: /^\p{Letter}+$/u,
      })
    ).toBe("\u00e9");
    expect(parseInteger(Number.MAX_SAFE_INTEGER, "byteLength", issues)).toBe(
      Number.MAX_SAFE_INTEGER
    );
    expect(
      parseCanonicalString("e\u0301", "protocol", issues, {
        maxBytes: 8,
        code: "INVALID_STRING",
      })
    ).toBeUndefined();
    expect(parseInteger(Number.MAX_SAFE_INTEGER + 1, "byteLength", issues)).toBeUndefined();
    expect(issues).toEqual([
      {
        code: "INVALID_STRING",
        path: "protocol",
        message: "Value must be canonical UTF-8 between 1 and 8 bytes",
      },
      {
        code: "EXPECTED_INTEGER",
        path: "byteLength",
        message: "Value must be a safe integer",
      },
    ]);
  });
});
