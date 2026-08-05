import { type Static, Type } from "typebox";

/** Research depth recorded by every Hyperresearch run ledger. */
export const HyperresearchTierSchema = Type.Union([Type.Literal("light"), Type.Literal("full")]);

/** Research depth recorded by every Hyperresearch run ledger. */
export type HyperresearchTier = Static<typeof HyperresearchTierSchema>;

/** Lifecycle states available to a persisted Hyperresearch step. */
export const HyperresearchStepStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("running"),
  Type.Literal("awaiting_agents"),
  Type.Literal("complete"),
  Type.Literal("blocked"),
  Type.Literal("failed"),
]);

/** Lifecycle state of a persisted Hyperresearch step. */
export type HyperresearchStepStatus = Static<typeof HyperresearchStepStatusSchema>;

/** CLI operation vocabulary retained as durable Hyperresearch run evidence. */
export const HyperresearchCliOperationSchema = Type.Union([
  Type.Literal("init"),
  Type.Literal("status"),
  Type.Literal("search"),
  Type.Literal("fetch"),
  Type.Literal("fetch-batch"),
  Type.Literal("note"),
  Type.Literal("graph"),
  Type.Literal("lint"),
  Type.Literal("sync"),
  Type.Literal("repair"),
  Type.Literal("export"),
]);

/** CLI operation retained as durable Hyperresearch run evidence. */
export type HyperresearchCliOperation = Static<typeof HyperresearchCliOperationSchema>;

/** Durable observation of one Hyperresearch CLI invocation. */
export const HyperresearchCliCallSchema = Type.Object(
  {
    operation: HyperresearchCliOperationSchema,
    args: Type.Array(Type.String()),
    cwd: Type.String({ minLength: 1 }),
    startedAt: Type.String({ minLength: 1 }),
    completedAt: Type.String({ minLength: 1 }),
    exitCode: Type.Number(),
    stdout: Type.Optional(Type.String()),
    stderr: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

/** Durable observation of one Hyperresearch CLI invocation. */
export type HyperresearchCliCall = Static<typeof HyperresearchCliCallSchema>;

/** Content identity recorded when a run loads one step definition. */
export const HyperresearchStepLoadSchema = Type.Object(
  {
    stepId: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    sha256: Type.String({ minLength: 1 }),
    loadedAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Content identity recorded when a run loads one step definition. */
export type HyperresearchStepLoad = Static<typeof HyperresearchStepLoadSchema>;

/** Durable lifecycle record for one step within a Hyperresearch run. */
export const HyperresearchStepRecordSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    status: HyperresearchStepStatusSchema,
    requiredArtifacts: Type.Array(Type.String({ minLength: 1 })),
    tierGate: Type.Optional(Type.Union([Type.Literal("all"), Type.Literal("full")])),
    sourceFileName: Type.Optional(Type.String({ minLength: 1 })),
    loaded: Type.Optional(HyperresearchStepLoadSchema),
    startedAt: Type.Optional(Type.String({ minLength: 1 })),
    completedAt: Type.Optional(Type.String({ minLength: 1 })),
    artifacts: Type.Array(Type.String({ minLength: 1 })),
    failure: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Durable lifecycle record for one step within a Hyperresearch run. */
export type HyperresearchStepRecord = Static<typeof HyperresearchStepRecordSchema>;

/** Durable observation of an operator resuming a Hyperresearch run. */
export const HyperresearchResumeEventSchema = Type.Object(
  {
    at: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
    nextStepId: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Durable observation of an operator resuming a Hyperresearch run. */
export type HyperresearchResumeEvent = Static<typeof HyperresearchResumeEventSchema>;

/** Durable failure recorded while a Hyperresearch run advances. */
export const HyperresearchFailureSchema = Type.Object(
  {
    at: Type.String({ minLength: 1 }),
    stepId: Type.Optional(Type.String({ minLength: 1 })),
    kind: Type.Union([
      Type.Literal("cli"),
      Type.Literal("agent"),
      Type.Literal("artifact"),
      Type.Literal("ledger"),
      Type.Literal("step"),
      Type.Literal("policy"),
    ]),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Durable failure recorded while a Hyperresearch run advances. */
export type HyperresearchFailure = Static<typeof HyperresearchFailureSchema>;

/** Lifecycle states available to a delegated Hyperresearch agent job. */
export const HyperresearchAgentJobStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("complete"),
  Type.Literal("failed"),
]);

/** Lifecycle state of a delegated Hyperresearch agent job. */
export type HyperresearchAgentJobStatus = Static<typeof HyperresearchAgentJobStatusSchema>;

/** Durable record of one attempt to complete a delegated agent job. */
export const HyperresearchAgentAttemptSchema = Type.Object(
  {
    attemptId: Type.String({ minLength: 1 }),
    attemptNumber: Type.Integer({ minimum: 1 }),
    status: Type.Union([
      Type.Literal("pending"),
      Type.Literal("non_clean"),
      Type.Literal("accepted"),
      Type.Literal("failed"),
    ]),
    classification: Type.Optional(Type.String({ minLength: 1 })),
    replacesAttemptId: Type.Optional(Type.String({ minLength: 1 })),
    replacementReason: Type.Optional(Type.String({ minLength: 1 })),
    outputPath: Type.Optional(Type.String({ minLength: 1 })),
    outputSha256: Type.Optional(Type.String({ minLength: 1 })),
    createdAt: Type.Optional(Type.String({ minLength: 1 })),
    completedAt: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Durable record of one attempt to complete a delegated agent job. */
export type HyperresearchAgentAttempt = Static<typeof HyperresearchAgentAttemptSchema>;

/** Identity and transition record for one delegated Hyperresearch agent job. */
export const HyperresearchAgentJobSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    logicalJobId: Type.Optional(Type.String({ minLength: 1 })),
    attemptId: Type.Optional(Type.String({ minLength: 1 })),
    attemptNumber: Type.Optional(Type.Integer({ minimum: 1 })),
    attempts: Type.Optional(Type.Array(HyperresearchAgentAttemptSchema)),
    activeAttemptId: Type.Optional(Type.String({ minLength: 1 })),
    acceptedAttemptId: Type.Optional(Type.String({ minLength: 1 })),
    replacesAttemptId: Type.Optional(Type.String({ minLength: 1 })),
    replacementReason: Type.Optional(Type.String({ minLength: 1 })),
    originalAttemptClassification: Type.Optional(Type.String({ minLength: 1 })),
    acceptedOutputPath: Type.Optional(Type.String({ minLength: 1 })),
    acceptedOutputSha256: Type.Optional(Type.String({ minLength: 1 })),
    acceptedAt: Type.Optional(Type.String({ minLength: 1 })),
    stepId: Type.String({ minLength: 1 }),
    role: Type.String({ minLength: 1 }),
    status: HyperresearchAgentJobStatusSchema,
    packetPath: Type.String({ minLength: 1 }),
    expectedOutputPath: Type.String({ minLength: 1 }),
    outputPath: Type.Optional(Type.String({ minLength: 1 })),
    createdAt: Type.String({ minLength: 1 }),
    completedAt: Type.Optional(Type.String({ minLength: 1 })),
    failure: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Identity and transition record for one delegated Hyperresearch agent job. */
export type HyperresearchAgentJob = Static<typeof HyperresearchAgentJobSchema>;

/** Durable disposition of one finding raised while reviewing a run. */
export const HyperresearchReviewDispositionSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    severity: Type.Union([Type.Literal("blocking"), Type.Literal("warning")]),
    status: Type.Union([
      Type.Literal("open"),
      Type.Literal("accepted"),
      Type.Literal("deferred"),
      Type.Literal("closed"),
    ]),
    evidence: Type.Array(Type.String({ minLength: 1 })),
    disposition: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Durable disposition of one finding raised while reviewing a run. */
export type HyperresearchReviewDisposition = Static<typeof HyperresearchReviewDispositionSchema>;

/** Content-addressed report snapshot retained by a Hyperresearch run. */
export const HyperresearchReportSnapshotSchema = Type.Object(
  {
    stepId: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    sha256: Type.String({ minLength: 1 }),
    createdAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Content-addressed report snapshot retained by a Hyperresearch run. */
export type HyperresearchReportSnapshot = Static<typeof HyperresearchReportSnapshotSchema>;

/** Durable evidence linking a captured source to its run activity. */
export const HyperresearchSourceCaptureSchema = Type.Object(
  {
    url: Type.String({ minLength: 1 }),
    stepIds: Type.Array(Type.String({ minLength: 1 })),
    suggestedByAgentJobIds: Type.Array(Type.String({ minLength: 1 })),
    evidence: Type.Array(Type.String({ minLength: 1 })),
    cliCallIndexes: Type.Array(Type.Number()),
    noteIds: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    sourceIds: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    capturedAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Durable evidence linking a captured source to its run activity. */
export type HyperresearchSourceCapture = Static<typeof HyperresearchSourceCaptureSchema>;

/** Durable report snapshot and violations used to enforce patch-only updates. */
export const HyperresearchPatchGuardSchema = Type.Object(
  {
    snapshotPath: Type.Optional(Type.String({ minLength: 1 })),
    snapshotSha256: Type.Optional(Type.String({ minLength: 1 })),
    violations: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Durable report snapshot and violations used to enforce patch-only updates. */
export type HyperresearchPatchGuard = Static<typeof HyperresearchPatchGuardSchema>;

/** Cross-module aggregate carrying a Hyperresearch run's identity and transitions. */
export const HyperresearchRunLedgerSchema = Type.Object(
  {
    version: Type.Union([Type.Literal(1), Type.Literal(2)]),
    runId: Type.String({ minLength: 1 }),
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    tierSource: Type.Optional(
      Type.Union([
        Type.Literal("user"),
        Type.Literal("auto-default"),
        Type.Literal("decomposition"),
        Type.Literal("fixture"),
      ])
    ),
    vaultTag: Type.Optional(Type.String({ minLength: 1 })),
    vaultRoot: Type.String({ minLength: 1 }),
    artifactRoot: Type.String({ minLength: 1 }),
    stepsRoot: Type.Optional(Type.String({ minLength: 1 })),
    queryFilePath: Type.Optional(Type.String({ minLength: 1 })),
    routeStepIds: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    wrapperRequirements: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    currentStepId: Type.Optional(Type.String({ minLength: 1 })),
    completed: Type.Boolean(),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
    steps: Type.Array(HyperresearchStepRecordSchema),
    cliCalls: Type.Array(HyperresearchCliCallSchema),
    agentJobs: Type.Optional(Type.Array(HyperresearchAgentJobSchema)),
    reviewDispositions: Type.Optional(Type.Array(HyperresearchReviewDispositionSchema)),
    reportSnapshots: Type.Optional(Type.Array(HyperresearchReportSnapshotSchema)),
    sourceCaptures: Type.Optional(Type.Array(HyperresearchSourceCaptureSchema)),
    patchGuard: Type.Optional(HyperresearchPatchGuardSchema),
    resumes: Type.Array(HyperresearchResumeEventSchema),
    failures: Type.Array(HyperresearchFailureSchema),
  },
  { additionalProperties: false }
);

/** Cross-module Hyperresearch run aggregate derived from its canonical schema. */
export type HyperresearchRunLedger = Static<typeof HyperresearchRunLedgerSchema>;
