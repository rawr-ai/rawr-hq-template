import type { Effect } from "effect";
import { ReadonlyObject, type Static, Type } from "typebox";
import Schema from "typebox/schema";

/** Maximum detail retained by one rule-evaluation failure. */
export const MAX_RULE_EVALUATION_FAILURE_DETAIL = 4_096;

const NonEmptyStringSchema = Type.String({
  minLength: 1,
});

/** Structural schema for one source position reported by an evaluator. */
export const RuleEvaluationPositionSchema = ReadonlyObject(
  Type.Object({
    line: Type.Integer({
      minimum: 1,
      description: "One-based source line",
    }),
    column: Type.Integer({
      minimum: 1,
      description: "One-based source column",
    }),
    offset: Type.Integer({
      minimum: 0,
      description: "Zero-based evaluator-native source offset",
    }),
  }),
  { additionalProperties: false }
);

/** Structural schema for one provider-neutral evaluation finding. */
export const RuleEvaluationFindingSchema = ReadonlyObject(
  Type.Object({
    path: Type.String({
      minLength: 1,
      description: "Subject path reported by the evaluator",
    }),
    start: RuleEvaluationPositionSchema,
    end: RuleEvaluationPositionSchema,
    message: Type.Union([Type.String(), Type.Null()], {
      description: "Evaluator-authored diagnostic message when one was produced",
    }),
  }),
  { additionalProperties: false }
);

/** Structural schema for one already-resolved evaluation request. */
export const RuleEvaluationRequestSchema = ReadonlyObject(
  Type.Object({
    program: Type.String({
      minLength: 1,
      description: "Already-resolved evaluator program",
    }),
    subjectPaths: ReadonlyObject(Type.Array(NonEmptyStringSchema), {
      minItems: 1,
      description: "Non-empty caller-resolved absolute subject paths",
    }),
  }),
  { additionalProperties: false }
);

/** Structural schema for one completed evaluation. */
export const RuleEvaluationResultSchema = ReadonlyObject(
  Type.Object({
    findings: ReadonlyObject(Type.Array(RuleEvaluationFindingSchema), {
      description: "Findings reported by the evaluator in provider-defined stable order",
    }),
  }),
  { additionalProperties: false }
);

/** Provider-neutral mechanical failure reasons for one evaluation attempt. */
export const RuleEvaluationFailureReasonSchema = Type.Union(
  [
    Type.Literal("InvalidInput"),
    Type.Literal("SetupFailed"),
    Type.Literal("ExecutionFailed"),
    Type.Literal("TimedOut"),
    Type.Literal("InvalidOutput"),
  ],
  {
    description: "Mechanical reason an evaluation could not produce a valid result",
  }
);

/** Structural schema for one bounded typed evaluation failure. */
export const RuleEvaluationFailureSchema = ReadonlyObject(
  Type.Object({
    _tag: Type.Literal("RuleEvaluationFailure"),
    reason: RuleEvaluationFailureReasonSchema,
    detail: Type.String({
      minLength: 1,
      maxLength: MAX_RULE_EVALUATION_FAILURE_DETAIL,
      description: "Bounded operational failure detail",
    }),
  }),
  { additionalProperties: false }
);

/** One evaluator-reported source position. */
export type RuleEvaluationPosition = Static<typeof RuleEvaluationPositionSchema>;

/** One provider-neutral finding. */
export type RuleEvaluationFinding = Static<typeof RuleEvaluationFindingSchema>;

/** One already-resolved evaluation request. */
export type RuleEvaluationRequest = Static<typeof RuleEvaluationRequestSchema>;

/** One completed evaluation result. */
export type RuleEvaluationResult = Static<typeof RuleEvaluationResultSchema>;

/** One provider-neutral mechanical failure reason. */
export type RuleEvaluationFailureReason = Static<typeof RuleEvaluationFailureReasonSchema>;

/** One typed mechanical evaluation failure. */
export type RuleEvaluationFailure = Static<typeof RuleEvaluationFailureSchema>;

const ruleEvaluationFailureValidator = Schema.Compile(RuleEvaluationFailureSchema);

/** Checks an unknown value against the complete rule-evaluation failure contract. */
export function isRuleEvaluationFailure(input: unknown): input is RuleEvaluationFailure {
  return ruleEvaluationFailureValidator.Check(input);
}

/** Provider-neutral capability for evaluating one resolved program. */
export interface RuleEvaluationResource<R = never> {
  readonly evaluate: (
    input: RuleEvaluationRequest
  ) => Effect.Effect<RuleEvaluationResult, RuleEvaluationFailure, R>;
}
