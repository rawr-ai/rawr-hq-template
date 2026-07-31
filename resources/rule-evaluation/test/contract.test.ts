import { describe, expect, test } from "bun:test";
import type { Static } from "typebox";
import Schema from "typebox/schema";

import {
  isRuleEvaluationFailure,
  type RuleEvaluationFailure,
  RuleEvaluationFailureSchema,
  type RuleEvaluationFinding,
  RuleEvaluationFindingSchema,
  type RuleEvaluationRequest,
  RuleEvaluationRequestSchema,
  type RuleEvaluationResult,
  RuleEvaluationResultSchema,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

export type RequestComesFromTypeBox = Expect<
  Equal<RuleEvaluationRequest, Static<typeof RuleEvaluationRequestSchema>>
>;
export type FindingComesFromTypeBox = Expect<
  Equal<RuleEvaluationFinding, Static<typeof RuleEvaluationFindingSchema>>
>;
export type ResultComesFromTypeBox = Expect<
  Equal<RuleEvaluationResult, Static<typeof RuleEvaluationResultSchema>>
>;
export type FailureComesFromTypeBox = Expect<
  Equal<RuleEvaluationFailure, Static<typeof RuleEvaluationFailureSchema>>
>;

const requestValidator = Schema.Compile(RuleEvaluationRequestSchema);
const resultValidator = Schema.Compile(RuleEvaluationResultSchema);

describe("rule-evaluation contract", () => {
  test("admits one resolved program and a non-empty subject path set", () => {
    expect(
      requestValidator.Check({
        program: "language js\n`forbidden()`",
        subjectPaths: ["/workspace/source.ts"],
      })
    ).toBe(true);

    for (const candidate of [
      { program: "", subjectPaths: ["/workspace/source.ts"] },
      { program: "language js\n`forbidden()`", subjectPaths: [] },
      { program: "language js\n`forbidden()`", subjectPaths: [""] },
      {
        program: "language js\n`forbidden()`",
        subjectPaths: ["/workspace/source.ts"],
        severity: "error",
      },
    ]) {
      expect(requestValidator.Check(candidate)).toBe(false);
    }
  });

  test("validates exact clean and finding results", () => {
    expect(resultValidator.Check({ findings: [] })).toBe(true);
    expect(
      resultValidator.Check({
        findings: [
          {
            path: "/workspace/source.ts",
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 12, offset: 11 },
            message: null,
          },
        ],
      })
    ).toBe(true);
    expect(
      resultValidator.Check({
        findings: [],
        lane: "enforced",
      })
    ).toBe(false);
  });

  test("recognizes only complete typed mechanical failures", () => {
    const failure: RuleEvaluationFailure = Object.freeze({
      _tag: "RuleEvaluationFailure",
      reason: "TimedOut",
      detail: "Evaluation exceeded 1000ms",
    });
    expect(isRuleEvaluationFailure(failure)).toBe(true);
    expect(isRuleEvaluationFailure({ ...failure, reason: "NotApplicable" })).toBe(false);
    expect(isRuleEvaluationFailure({ ...failure, reason: "CleanupFailed" })).toBe(false);
    expect(isRuleEvaluationFailure({ ...failure, detail: "" })).toBe(false);
    expect(isRuleEvaluationFailure({ ...failure, retryable: true })).toBe(false);
  });
});
