import {
  RuleEvaluationFailureReasonSchema,
  RuleEvaluationPositionSchema,
} from "@habitat/resource-rule-evaluation";
import { type Static, Type } from "typebox";
import { CatalogIssueSchema } from "./catalog";

const SelectorValueSchema = Type.String({
  minLength: 1,
  maxLength: 250,
  description: "Non-empty selector value interpreted against resolved applications.",
});

const CheckSelectorsSchema = Type.Object(
  {
    owner: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 250,
        description: "Repository project identity whose applications enter the check.",
      })
    ),
    rule: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 200,
        description: "Single rule identity whose applications enter the check.",
      })
    ),
    rules: Type.Optional(
      Type.Array(SelectorValueSchema, {
        minItems: 1,
        uniqueItems: true,
        description: "Rule identities whose applications enter the check.",
      })
    ),
    runner: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 100,
        description: "Runner identity whose applications enter the check.",
      })
    ),
  },
  {
    additionalProperties: false,
    description: "Optional intersection of resolved-application selectors.",
  }
);

/** Closed request for checking the currently resolved Habitat catalog. */
export const CheckCatalogInputSchema = Type.Object(
  {
    selectors: Type.Optional(CheckSelectorsSchema),
  },
  {
    additionalProperties: false,
    description: "Habitat catalog check request.",
  }
);

const CheckSelectionIssueCodeSchema = Type.Union(
  [
    Type.Literal("selector-empty"),
    Type.Literal("selector-unknown"),
    Type.Literal("selector-wrong-namespace"),
    Type.Literal("runner-unsupported"),
  ],
  {
    description: "Stable semantic reason a requested application selection was refused.",
  }
);

const CheckSelectionIssueSchema = Type.Object(
  {
    code: CheckSelectionIssueCodeSchema,
    selector: Type.String({
      minLength: 1,
      maxLength: 500,
      description: "Selector or application identity responsible for the refusal.",
    }),
    message: Type.String({
      minLength: 1,
      maxLength: 8_192,
      description: "Bounded refusal detail.",
    }),
  },
  {
    additionalProperties: false,
    description: "One expected application-selection refusal.",
  }
);

const CheckFindingSchema = Type.Object(
  {
    path: Type.String({
      minLength: 1,
      maxLength: 4_096,
      description: "Normalized repository-relative source path.",
    }),
    start: RuleEvaluationPositionSchema,
    end: RuleEvaluationPositionSchema,
    message: Type.Union([Type.String(), Type.Null()], {
      description: "Evaluator-authored diagnostic message when one was produced.",
    }),
    severity: Type.Union([Type.Literal("error"), Type.Literal("advisory")], {
      description: "Service-owned severity derived from the application lane.",
    }),
    baselined: Type.Literal(false, {
      description:
        "Version-three findings are not admitted through the predecessor baseline model.",
    }),
  },
  {
    additionalProperties: false,
    description: "One mechanically observed finding with Habitat semantics.",
  }
);

const CheckApplicationStatusSchema = Type.Union(
  [
    Type.Literal("pass"),
    Type.Literal("fail"),
    Type.Literal("advisory-findings"),
    Type.Literal("error"),
  ],
  {
    description: "Semantic terminal status for one resolved application.",
  }
);

const CheckApplicationDispositionSchema = Type.Union(
  [
    Type.Object(
      {
        kind: Type.Literal("evaluated", {
          description: "The application completed mechanical evaluation.",
        }),
      },
      {
        additionalProperties: false,
        description: "Completed mechanical evaluation disposition.",
      }
    ),
    Type.Object(
      {
        kind: Type.Literal("failed", {
          description: "The application could not produce trusted findings.",
        }),
        reason: Type.Union(
          [
            RuleEvaluationFailureReasonSchema,
            Type.Literal("PatternReadFailed"),
            Type.Literal("PatternInvalid"),
            Type.Literal("FindingPathInvalid"),
          ],
          {
            description: "Stable operational failure reason.",
          }
        ),
        detail: Type.String({
          minLength: 1,
          maxLength: 4_096,
          description: "Bounded operational failure detail.",
        }),
      },
      {
        additionalProperties: false,
        description: "Failed application evaluation disposition.",
      }
    ),
  ],
  {
    description: "Mechanical disposition underlying one semantic application status.",
  }
);

const CheckApplicationReportSchema = Type.Object(
  {
    ownerProject: Type.String({
      minLength: 1,
      maxLength: 250,
      description: "Repository project that owns the resolved application.",
    }),
    instanceId: Type.String({
      minLength: 1,
      maxLength: 250,
      description: "Repository-unique instance identity.",
    }),
    ruleId: Type.String({
      minLength: 1,
      maxLength: 200,
      description: "Resolved rule identity.",
    }),
    runner: Type.Literal("grit", {
      description: "Mechanical runner used by this check operation.",
    }),
    lane: Type.Union([Type.Literal("enforced"), Type.Literal("advisory")], {
      description: "Application policy lane.",
    }),
    locked: Type.Literal(false, {
      description: "Version-three applications do not inherit predecessor baseline locking.",
    }),
    status: CheckApplicationStatusSchema,
    message: Type.String({
      minLength: 1,
      maxLength: 8_192,
      description: "Rule-authored finding message.",
    }),
    remediate: Type.Union([Type.String({ maxLength: 16_384 }), Type.Null()], {
      description: "Rule-authored remediation when supplied.",
    }),
    disposition: CheckApplicationDispositionSchema,
    findings: Type.Array(CheckFindingSchema, {
      description: "Deterministically ordered findings for this application.",
    }),
  },
  {
    additionalProperties: false,
    description: "One resolved application check report.",
  }
);

/** Closed total result for one current-catalog check. */
export const CheckCatalogResultSchema = Type.Union(
  [
    Type.Object(
      {
        _tag: Type.Literal("CatalogRejected", {
          description: "Catalog admission failed before application selection.",
        }),
        issues: Type.Array(CatalogIssueSchema, {
          minItems: 1,
          description: "Catalog issues that prevented checking.",
        }),
      },
      {
        additionalProperties: false,
        description: "Catalog-stage check refusal.",
      }
    ),
    Type.Object(
      {
        _tag: Type.Literal("SelectionRejected", {
          description: "Application selection failed before mechanical evaluation.",
        }),
        issues: Type.Array(CheckSelectionIssueSchema, {
          minItems: 1,
          description: "Selection issues that prevented checking.",
        }),
      },
      {
        additionalProperties: false,
        description: "Selection-stage check refusal.",
      }
    ),
    Type.Object(
      {
        _tag: Type.Literal("Completed", {
          description: "All selected applications reached a semantic terminal status.",
        }),
        ok: Type.Boolean({
          description: "Whether no enforced finding or operational error occurred.",
        }),
        applications: Type.Array(CheckApplicationReportSchema, {
          description: "Application reports in stable rule and instance order.",
        }),
      },
      {
        additionalProperties: false,
        description: "Completed Habitat catalog check.",
      }
    ),
  ],
  {
    description: "Catalog refusal, selection refusal, or completed check outcome.",
  }
);

/** Caller request for one current-catalog check. */
export type CheckCatalogInput = Static<typeof CheckCatalogInputSchema>;

/** Total result for one current-catalog check. */
export type CheckCatalogResult = Static<typeof CheckCatalogResultSchema>;

/** One semantic report within a completed check. */
export type CheckApplicationReport = Extract<
  CheckCatalogResult,
  { _tag: "Completed" }
>["applications"][number];

/** One expected selection refusal. */
export type CheckSelectionIssue = Extract<
  CheckCatalogResult,
  { _tag: "SelectionRejected" }
>["issues"][number];
