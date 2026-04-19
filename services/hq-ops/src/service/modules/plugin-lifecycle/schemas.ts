import { type Static, Type } from "typebox";
import type {
  DecideMergePolicyInput,
  DecideMergePolicyResult,
  EvaluateLifecycleCompletenessInput,
  LifecycleCheckData,
  PrContext,
  ResolveLifecycleTargetInput,
  ResolveLifecycleTargetResult,
  ScratchPolicyCheck,
  ScratchPolicyCheckInput,
} from "./model";

export const LifecycleTypeSchema = Type.Union([
  Type.Literal("cli"),
  Type.Literal("web"),
  Type.Literal("agent"),
  Type.Literal("skill"),
  Type.Literal("workflow"),
  Type.Literal("composed"),
]);

export const LifecycleTargetSchema = Type.Object(
  {
    input: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    relPath: Type.String(),
    type: LifecycleTypeSchema,
  },
  { additionalProperties: false },
);

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

export const ResolveLifecycleTargetInputSchema = Type.Unsafe<ResolveLifecycleTargetInput>(
  Type.Object(
    {
      workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
      currentWorkingDirectory: Type.Optional(Type.String({ minLength: 1 })),
      target: Type.String({ minLength: 1 }),
      type: LifecycleTypeSchema,
      workspacePlugins: Type.Optional(Type.Array(LifecycleWorkspacePluginSchema)),
      existingPaths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    },
    { additionalProperties: false },
  ),
);

export const ResolveLifecycleTargetResultSchema = Type.Unsafe<ResolveLifecycleTargetResult>(
  Type.Object(
    {
      found: Type.Boolean(),
      target: Type.Optional(LifecycleTargetSchema),
      candidates: Type.Array(Type.String({ minLength: 1 })),
      reason: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
);

export const LifecycleCheckDataSchema = Type.Unsafe<LifecycleCheckData>(
  Type.Object(
    {
      status: Type.Union([Type.Literal("pass"), Type.Literal("fail")]),
      target: LifecycleTargetSchema,
      missingTests: Type.Array(Type.String()),
      missingDocs: Type.Array(Type.String()),
      missingDependents: Type.Array(Type.String()),
      syncVerified: Type.Boolean(),
      driftVerified: Type.Boolean(),
      driftDetected: Type.Boolean(),
      details: Type.Object(
        {
          changedFilesConsidered: Type.Array(Type.String()),
          relevantChangedFiles: Type.Array(Type.String()),
          dependentFiles: Type.Array(Type.String()),
          codeChanged: Type.Array(Type.String()),
          testChanged: Type.Array(Type.String()),
          docsChanged: Type.Array(Type.String()),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);

export const EvaluateLifecycleCompletenessInputSchema = Type.Unsafe<EvaluateLifecycleCompletenessInput>(
  Type.Object(
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
  ),
);

export const ScratchPolicyModeSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("warn"),
  Type.Literal("block"),
]);

export const ScratchPolicyCheckInputSchema = Type.Unsafe<ScratchPolicyCheckInput>(
  Type.Object(
    {
      mode: Type.Optional(ScratchPolicyModeSchema),
      bypassed: Type.Optional(Type.Boolean()),
      planScratchPaths: Type.Array(Type.String()),
      workingPadPaths: Type.Array(Type.String()),
    },
    { additionalProperties: false },
  ),
);

export const ScratchPolicyCheckSchema = Type.Unsafe<ScratchPolicyCheck>(
  Type.Object(
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
  ),
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

const PrContextSchema = Type.Unsafe<PrContext>(
  Type.Object(
    {
      branch: Type.String(),
      prNumber: Type.Union([Type.Number(), Type.Null()]),
      prUrl: Type.Union([Type.String(), Type.Null()]),
      commentsCount: Type.Number(),
      commentsSummary: Type.Array(Type.String()),
    },
    { additionalProperties: false },
  ),
);

export const DecideMergePolicyInputSchema = Type.Unsafe<DecideMergePolicyInput>(
  Type.Object(
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
  ),
);

export const DecideMergePolicyResultSchema = Type.Unsafe<DecideMergePolicyResult>(
  Type.Object(
    {
      prContext: PrContextSchema,
      policyAssessment: Type.Object(
        {
          judge1: JudgeResultSchema,
          judge2: JudgeResultSchema,
          consensus: Type.Union([
            Type.Literal("auto_merge"),
            Type.Literal("fix_first"),
            Type.Literal("policy_escalation"),
            Type.Literal("hold"),
          ]),
          confidence: Type.Number(),
        },
        { additionalProperties: false },
      ),
      decision: Type.Union([
        Type.Literal("auto_merge"),
        Type.Literal("fix_first"),
        Type.Literal("policy_escalation"),
        Type.Literal("hold"),
      ]),
      fixSlicePlan: Type.Optional(
        Type.Object(
          {
            branchName: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export type ResolveLifecycleTargetInputDto = Static<typeof ResolveLifecycleTargetInputSchema>;
export type ResolveLifecycleTargetResultDto = Static<typeof ResolveLifecycleTargetResultSchema>;
export type EvaluateLifecycleCompletenessInputDto = Static<typeof EvaluateLifecycleCompletenessInputSchema>;
export type LifecycleCheckDataDto = Static<typeof LifecycleCheckDataSchema>;
export type ScratchPolicyCheckInputDto = Static<typeof ScratchPolicyCheckInputSchema>;
export type ScratchPolicyCheckDto = Static<typeof ScratchPolicyCheckSchema>;
export type DecideMergePolicyInputDto = Static<typeof DecideMergePolicyInputSchema>;
export type DecideMergePolicyResultDto = Static<typeof DecideMergePolicyResultSchema>;
