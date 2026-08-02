import { describe, expect, test } from "bun:test";
import type { Static } from "typebox";
import Schema from "typebox/schema";

import {
  isRuleEvaluationFailure,
  type RuleEvaluationFailure,
  RuleEvaluationFailureSchema,
  type RuleEvaluationFinding,
  RuleEvaluationFindingSchema,
  type RuleEvaluationProgram,
  type RuleEvaluationProgramResult,
  RuleEvaluationProgramResultSchema,
  RuleEvaluationProgramSchema,
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
export type ProgramComesFromTypeBox = Expect<
  Equal<RuleEvaluationProgram, Static<typeof RuleEvaluationProgramSchema>>
>;
export type ProgramResultComesFromTypeBox = Expect<
  Equal<RuleEvaluationProgramResult, Static<typeof RuleEvaluationProgramResultSchema>>
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
  test("admits an ordered resolved-program batch and a non-empty subject path set", () => {
    expect(
      requestValidator.Check({
        programs: [
          { id: "first", program: "language js\n`forbidden()`" },
          { id: "second", program: "language js\n`another_forbidden()`" },
        ],
        subjectPaths: ["/workspace/source.ts"],
      })
    ).toBe(true);

    for (const candidate of [
      { programs: [], subjectPaths: ["/workspace/source.ts"] },
      { programs: [{ id: "", program: "language js\n`forbidden()`" }], subjectPaths: [] },
      { programs: [{ id: "first", program: "" }], subjectPaths: ["/workspace/source.ts"] },
      {
        programs: [{ id: "first", program: "language js\n`forbidden()`" }],
        subjectPaths: [""],
      },
      {
        programs: [{ id: "first", program: "language js\n`forbidden()`" }],
        subjectPaths: ["/workspace/source.ts"],
        severity: "error",
      },
    ]) {
      expect(requestValidator.Check(candidate)).toBe(false);
    }
  });

  test("validates exact attributed clean and finding results", () => {
    expect(resultValidator.Check({ results: [{ programId: "first", findings: [] }] })).toBe(true);
    expect(
      resultValidator.Check({
        results: [
          {
            programId: "first",
            findings: [
              {
                path: "/workspace/source.ts",
                start: { line: 1, column: 1, offset: 0 },
                end: { line: 1, column: 12, offset: 11 },
                message: null,
              },
            ],
          },
        ],
      })
    ).toBe(true);
    expect(
      resultValidator.Check({
        results: [{ programId: "first", findings: [] }],
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
