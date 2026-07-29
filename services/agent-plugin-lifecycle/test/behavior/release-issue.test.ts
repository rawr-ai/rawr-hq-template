import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  MAX_RELEASE_ISSUE_ACTUAL_LENGTH,
  MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH,
  MAX_RELEASE_ISSUE_CLAIM_LENGTH,
  MAX_RELEASE_ISSUE_CLAIMANT_LENGTH,
  MAX_RELEASE_ISSUE_CLAIMANTS,
  MAX_RELEASE_ISSUE_EXPECTED_LENGTH,
  MAX_RELEASE_ISSUE_MESSAGE_LENGTH,
  MAX_RELEASE_ISSUE_PATH_LENGTH,
  RELEASE_ISSUE_CODES,
  type ReleaseIssue,
  type ReleaseIssueCode,
  ReleaseIssueCodeSchema,
  ReleaseIssueSchema,
} from "../../src/service/model/dto/release-issue";
import {
  parseCanonicalRef,
  parseGitBlobSelection,
} from "../../src/service/model/policy/current-main-git";
import { releaseIssue, sortReleaseIssues } from "../../src/service/model/policy/release-issue";

const TRUNCATED_SUFFIX = "...[truncated]";

describe("release issue model", () => {
  it("derives a closed diagnostic and exact code vocabulary from TypeBox", () => {
    expectTypeOf<ReleaseIssue>().toEqualTypeOf<Static<typeof ReleaseIssueSchema>>();
    expectTypeOf<ReleaseIssueCode>().toEqualTypeOf<Static<typeof ReleaseIssueCodeSchema>>();
    expect({
      path: MAX_RELEASE_ISSUE_PATH_LENGTH,
      message: MAX_RELEASE_ISSUE_MESSAGE_LENGTH,
      expected: MAX_RELEASE_ISSUE_EXPECTED_LENGTH,
      actual: MAX_RELEASE_ISSUE_ACTUAL_LENGTH,
      claimKind: MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH,
      claim: MAX_RELEASE_ISSUE_CLAIM_LENGTH,
      claimant: MAX_RELEASE_ISSUE_CLAIMANT_LENGTH,
      claimants: MAX_RELEASE_ISSUE_CLAIMANTS,
    }).toEqual({
      path: 4_096,
      message: 4_096,
      expected: 4_096,
      actual: 4_096,
      claimKind: 32,
      claim: 512,
      claimant: 512,
      claimants: 200_000,
    });

    const diagnostic = releaseIssue(
      "INVALID_STRING",
      "members[0].pluginId",
      "Plugin id is invalid"
    );
    expect(Value.Check(ReleaseIssueSchema, diagnostic)).toBe(true);
    expect(Value.Check(ReleaseIssueSchema, { ...diagnostic, unexpected: true })).toBe(false);
    expect(RELEASE_ISSUE_CODES).toEqual([
      "EXPECTED_ARRAY",
      "EXPECTED_BYTES",
      "EXPECTED_INTEGER",
      "EXPECTED_OBJECT",
      "EXPECTED_STRING",
      "UNKNOWN_FIELD",
      "INVALID_SCHEMA_VERSION",
      "INVALID_STRING",
      "INVALID_CONTENT_AUTHORITY",
      "INVALID_REPOSITORY_IDENTITY",
      "INVALID_GIT_OBJECT_ID",
      "INVALID_PLUGIN_ID",
      "INVALID_OWNERSHIP_IDENTITY",
      "INVALID_RELATIVE_PATH",
      "INVALID_MODE",
      "INVALID_DIGEST",
      "INVALID_BASE64",
      "DUPLICATE_VALUE",
      "DUPLICATE_PAYLOAD_PATH",
      "DUPLICATE_PLUGIN_ID",
      "DUPLICATE_OWNERSHIP_CLAIM",
      "OWNERSHIP_CONFLICT",
      "MISSING_OWNER",
      "SKILL_OWNERSHIP_MISMATCH",
      "FORBIDDEN_UNIT_KIND",
      "COUNT_LIMIT_EXCEEDED",
      "PAYLOAD_BYTES_LIMIT_EXCEEDED",
      "ENVELOPE_TOO_LARGE",
      "INVALID_UTF8",
      "INVALID_JSON",
      "NON_CANONICAL_ENVELOPE",
      "RELEASE_INPUT_DIGEST_MISMATCH",
      "PAYLOAD_DIGEST_MISMATCH",
      "PAYLOAD_MANIFEST_MISMATCH",
      "RELEASE_DIGEST_MISMATCH",
      "RELEASE_SET_DIGEST_MISMATCH",
      "MEMBER_NOT_DECLARED",
      "MISSING_EXPECTED_MEMBER",
      "EXTRA_MEMBER",
      "SOURCE_IDENTITY_MISMATCH",
      "RELEASE_INPUT_IDENTITY_MISMATCH",
      "OWNERSHIP_INDEX_MISMATCH",
    ]);
    expect(Value.Check(ReleaseIssueCodeSchema, "NOT_A_RELEASE_ISSUE")).toBe(false);

    const rawDiagnostic = {
      code: "INVALID_STRING",
      path: "value",
      message: "Value is invalid",
    } as const;
    expect(Value.Check(ReleaseIssueSchema, { ...rawDiagnostic, path: "" })).toBe(false);
    expect(Value.Check(ReleaseIssueSchema, { ...rawDiagnostic, message: "" })).toBe(false);
    for (const invalid of [
      { ...rawDiagnostic, path: "x".repeat(MAX_RELEASE_ISSUE_PATH_LENGTH + 1) },
      { ...rawDiagnostic, message: "x".repeat(MAX_RELEASE_ISSUE_MESSAGE_LENGTH + 1) },
      { ...rawDiagnostic, expected: "x".repeat(MAX_RELEASE_ISSUE_EXPECTED_LENGTH + 1) },
      { ...rawDiagnostic, actual: "x".repeat(MAX_RELEASE_ISSUE_ACTUAL_LENGTH + 1) },
      { ...rawDiagnostic, claimKind: "x".repeat(MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH + 1) },
      { ...rawDiagnostic, claim: "x".repeat(MAX_RELEASE_ISSUE_CLAIM_LENGTH + 1) },
      {
        ...rawDiagnostic,
        claimants: ["x".repeat(MAX_RELEASE_ISSUE_CLAIMANT_LENGTH + 1)],
      },
      {
        ...rawDiagnostic,
        claimants: Array<string>(MAX_RELEASE_ISSUE_CLAIMANTS + 1).fill("claimant"),
      },
      { ...rawDiagnostic, expected: Number.POSITIVE_INFINITY },
      { ...rawDiagnostic, actual: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      expect(Value.Check(ReleaseIssueSchema, invalid)).toBe(false);
    }
    expect(
      Value.Check(ReleaseIssueSchema, {
        ...rawDiagnostic,
        actual: Number.MAX_SAFE_INTEGER,
      })
    ).toBe(true);
  });

  it("applies every diagnostic bound with the exact truncation suffix", () => {
    const oversized = "x".repeat(8_192);
    const diagnostic = releaseIssue("INVALID_STRING", oversized, oversized, {
      expected: oversized,
      actual: oversized,
      claimKind: oversized,
      claim: oversized,
      claimants: [oversized],
    });

    expect(diagnostic.path).toBe(truncated(oversized, MAX_RELEASE_ISSUE_PATH_LENGTH));
    expect(diagnostic.message).toBe(truncated(oversized, MAX_RELEASE_ISSUE_MESSAGE_LENGTH));
    expect(diagnostic.expected).toBe(truncated(oversized, MAX_RELEASE_ISSUE_EXPECTED_LENGTH));
    expect(diagnostic.actual).toBe(truncated(oversized, MAX_RELEASE_ISSUE_ACTUAL_LENGTH));
    expect(diagnostic.claimKind).toBe(truncated(oversized, MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH));
    expect(diagnostic.claim).toBe(truncated(oversized, MAX_RELEASE_ISSUE_CLAIM_LENGTH));
    expect(diagnostic.claimants).toEqual([truncated(oversized, MAX_RELEASE_ISSUE_CLAIMANT_LENGTH)]);
    expect(Value.Check(ReleaseIssueSchema, diagnostic)).toBe(true);
  });

  it("retains finite safe numeric observations and bounds unsafe numbers as text", () => {
    expect(
      releaseIssue("EXPECTED_INTEGER", "value", "Expected integer", { actual: 42 }).actual
    ).toBe(42);
    expect(
      releaseIssue("EXPECTED_INTEGER", "value", "Expected integer", {
        actual: -Number.MAX_SAFE_INTEGER,
      }).actual
    ).toBe(-Number.MAX_SAFE_INTEGER);
    expect(
      releaseIssue("EXPECTED_INTEGER", "value", "Expected integer", {
        actual: Number.MAX_SAFE_INTEGER + 1,
      }).actual
    ).toBe(String(Number.MAX_SAFE_INTEGER + 1));
    expect(
      releaseIssue("EXPECTED_INTEGER", "value", "Expected integer", { actual: Number.NaN }).actual
    ).toBe("NaN");
    expect(
      releaseIssue("EXPECTED_INTEGER", "value", "Expected integer", {
        actual: Number.POSITIVE_INFINITY,
      }).actual
    ).toBe("Infinity");
  });

  it("always constructs a schema-valid diagnostic from typed arguments", () => {
    const diagnostic = releaseIssue("INVALID_STRING", "", "", {
      expected: Number.NEGATIVE_INFINITY,
    });

    expect(diagnostic).toEqual({
      code: "INVALID_STRING",
      path: "release",
      message: "Release validation failed",
      expected: "-Infinity",
    });
    expect(Value.Check(ReleaseIssueSchema, diagnostic)).toBe(true);
  });

  it("keeps legacy Git readers inside the diagnostic boundary", () => {
    for (const path of ["", "x".repeat(MAX_RELEASE_ISSUE_PATH_LENGTH + 1)]) {
      const results = [parseCanonicalRef(null, path), parseGitBlobSelection(null, path)];

      for (const result of results) {
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(
            result.issues.every((diagnostic) => Value.Check(ReleaseIssueSchema, diagnostic))
          ).toBe(true);
        }
      }
    }
  });

  it("clones, bounds, caps, and freezes claimant observations", () => {
    const oversized = "claimant".repeat(100);
    const claimants = Array<string>(MAX_RELEASE_ISSUE_CLAIMANTS + 1).fill("claimant");
    claimants[0] = oversized;
    const diagnostic = releaseIssue("OWNERSHIP_CONFLICT", "ownership", "Claim has many owners", {
      claimKind: "skill",
      claim: "shared",
      claimants,
    });

    expect(diagnostic.claimants).not.toBe(claimants);
    expect(diagnostic.claimants).toHaveLength(MAX_RELEASE_ISSUE_CLAIMANTS);
    expect(diagnostic.claimants?.[0]).toBe(truncated(oversized, MAX_RELEASE_ISSUE_CLAIMANT_LENGTH));
    expect(diagnostic.claimants?.at(-1)).toBe("claimant");
    expect(Value.Check(ReleaseIssueSchema, diagnostic)).toBe(true);
    claimants[0] = "changed";
    expect(diagnostic.claimants?.[0]).toBe(truncated(oversized, MAX_RELEASE_ISSUE_CLAIMANT_LENGTH));
    expect(Object.isFrozen(diagnostic)).toBe(true);
    expect(Object.isFrozen(diagnostic.claimants)).toBe(true);

    const sparse = releaseIssue("OWNERSHIP_CONFLICT", "ownership", "Sparse contenders", {
      claimants: Array<string>(1),
    });
    expect(sparse.claimants).toEqual([]);
    expect(Value.Check(ReleaseIssueSchema, sparse)).toBe(true);
  });

  it("sorts deterministically without mutating the caller's collection", () => {
    const laterMessage = releaseIssue("UNKNOWN_FIELD", "alpha", "B message", {
      claimKind: "skill",
      claim: "shared",
      claimants: ["alpha"],
      expected: 1,
      actual: 1,
    });
    const laterExpected = releaseIssue("UNKNOWN_FIELD", "alpha", "A message", {
      claimKind: "skill",
      claim: "shared",
      claimants: ["alpha"],
      expected: "1",
      actual: 1,
    });
    const laterActual = releaseIssue("UNKNOWN_FIELD", "alpha", "A message", {
      claimKind: "skill",
      claim: "shared",
      claimants: ["alpha"],
      expected: 1,
      actual: 2,
    });
    const first = releaseIssue("UNKNOWN_FIELD", "alpha", "A message", {
      claimKind: "skill",
      claim: "shared",
      claimants: ["alpha"],
      expected: 1,
      actual: 1,
    });
    const input = [laterMessage, laterExpected, laterActual, first];
    const original = [...input];

    const sorted = sortReleaseIssues(input);

    expect(input).toEqual(original);
    expect(sorted).not.toBe(input);
    expect(sorted).toEqual([first, laterActual, laterExpected, laterMessage]);
    expect(sortReleaseIssues([...input].reverse())).toEqual(sorted);
  });
});

function truncated(value: string, maximumLength: number): string {
  return `${value.slice(0, maximumLength - TRUNCATED_SUFFIX.length)}${TRUNCATED_SUFFIX}`;
}
