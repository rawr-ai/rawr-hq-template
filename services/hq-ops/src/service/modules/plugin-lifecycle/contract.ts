import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { LifecycleCheckDataSchema, LifecycleTargetSchema, LifecycleTypeSchema } from "./entities";

const LifecycleWorkspacePluginSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    name: Type.Optional(Type.String({ minLength: 1 })),
    dirName: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    kind: Type.String({ minLength: 1 }),
    capability: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const ScratchPolicyModeSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("warn"),
  Type.Literal("block"),
]);

const ScratchPolicyCheckSchema = Type.Object(
  {
    mode: ScratchPolicyModeSchema,
    bypassed: Type.Boolean(),
    required: Type.Object(
      {
        planScratch: Type.Boolean(),
        workingPad: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    missing: Type.Array(Type.String()),
    matches: Type.Object(
      {
        planScratchPaths: Type.Array(Type.String()),
        workingPadPaths: Type.Array(Type.String()),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

const RawJudgeResultInputSchema = Type.Object(
  {
    outcome: Type.Optional(Type.String()),
    confidence: Type.Optional(Type.Number()),
    reason: Type.Optional(Type.String()),
    raw: Type.Optional(Type.Any()),
  },
  { additionalProperties: false },
);

const PrContextInputSchema = Type.Object(
  {
    branch: Type.Optional(Type.String()),
    prNumber: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    prUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    commentsCount: Type.Optional(Type.Number()),
    commentsSummary: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false },
);

const JudgeResultSchema = Type.Object(
  {
    judge: Type.Union([Type.Literal("A"), Type.Literal("B")]),
    outcome: Type.Union([
      Type.Literal("auto_merge"),
      Type.Literal("fix_first"),
      Type.Literal("policy_escalation"),
      Type.Literal("insufficient_confidence"),
    ]),
    confidence: Type.Number(),
    reason: Type.String(),
    raw: Type.Optional(Type.Any()),
  },
  { additionalProperties: false },
);

const PrContextSchema = Type.Object(
  {
    branch: Type.String(),
    prNumber: Type.Union([Type.Number(), Type.Null()]),
    prUrl: Type.Union([Type.String(), Type.Null()]),
    commentsCount: Type.Number(),
    commentsSummary: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

const MergeDecisionSchema = Type.Union([
  Type.Literal("auto_merge"),
  Type.Literal("fix_first"),
  Type.Literal("policy_escalation"),
  Type.Literal("hold"),
]);

export const contract = {
  resolveLifecycleTarget: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(Type.Object(
      {
        workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        currentWorkingDirectory: Type.Optional(Type.String({ minLength: 1 })),
        target: Type.String({ minLength: 1 }),
        type: LifecycleTypeSchema,
        workspacePlugins: Type.Optional(Type.Array(LifecycleWorkspacePluginSchema)),
        existingPaths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
      },
      { additionalProperties: false },
    )))
    .output(schema(Type.Object(
      {
        found: Type.Boolean(),
        target: Type.Optional(LifecycleTargetSchema),
        candidates: Type.Array(Type.String({ minLength: 1 })),
        reason: Type.Optional(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false },
    ))),
  evaluateLifecycleCompleteness: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(Type.Object(
      {
        workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        targetInput: Type.String({ minLength: 1 }),
        targetAbs: Type.String({ minLength: 1 }),
        type: LifecycleTypeSchema,
        changedFiles: Type.Array(Type.String()),
        repoFiles: Type.Array(Type.String()),
        dependentFiles: Type.Optional(Type.Array(Type.String())),
        syncVerified: Type.Boolean(),
        driftVerified: Type.Boolean(),
        driftDetected: Type.Boolean(),
      },
      { additionalProperties: false },
    )))
    .output(schema(LifecycleCheckDataSchema)),
  checkScratchPolicy: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(Type.Object(
      {
        mode: Type.Optional(ScratchPolicyModeSchema),
        bypassed: Type.Optional(Type.Boolean()),
        planScratchPaths: Type.Array(Type.String()),
        workingPadPaths: Type.Array(Type.String()),
      },
      { additionalProperties: false },
    )))
    .output(schema(ScratchPolicyCheckSchema)),
  planSweepCandidates: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(Type.Object(
      {
        workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        explicitTargets: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        limit: Type.Optional(Type.Integer({ minimum: 1 })),
      },
      { additionalProperties: false },
    )))
    .output(schema(Type.Object(
      {
        workspaceRoot: Type.String({ minLength: 1 }),
        candidates: Type.Array(Type.Object(
          {
            target: Type.String({ minLength: 1 }),
            type: LifecycleTypeSchema,
            issues: Type.Array(Type.String({ minLength: 1 })),
          },
          { additionalProperties: false },
        )),
        queued: Type.Array(Type.Object(
          {
            target: Type.String({ minLength: 1 }),
            type: LifecycleTypeSchema,
            issues: Type.Array(Type.String({ minLength: 1 })),
          },
          { additionalProperties: false },
        )),
      },
      { additionalProperties: false },
    ))),
  decideMergePolicy: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(Type.Object(
      {
        lifecycle: LifecycleCheckDataSchema,
        prContext: Type.Optional(PrContextInputSchema),
        judgeA: Type.Optional(RawJudgeResultInputSchema),
        judgeB: Type.Optional(RawJudgeResultInputSchema),
        baseBranch: Type.Optional(Type.String()),
        changeUnitId: Type.Optional(Type.String()),
        nowIso: Type.Optional(Type.String()),
      },
      { additionalProperties: false },
    )))
    .output(schema(Type.Object(
      {
        prContext: PrContextSchema,
        policyAssessment: Type.Object(
          {
            judge1: JudgeResultSchema,
            judge2: JudgeResultSchema,
            consensus: MergeDecisionSchema,
            confidence: Type.Number(),
          },
          { additionalProperties: false },
        ),
        decision: MergeDecisionSchema,
        fixSlicePlan: Type.Optional(Type.Object(
          {
            branchName: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        )),
      },
      { additionalProperties: false },
    ))),
};

export type PluginLifecycleModuleContract = typeof contract;
