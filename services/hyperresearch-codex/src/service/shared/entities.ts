import { type Static, Type } from "typebox";

export const HyperresearchTierSchema = Type.Union([
  Type.Literal("light"),
  Type.Literal("full"),
]);
export type HyperresearchTier = Static<typeof HyperresearchTierSchema>;

export const HyperresearchStepStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("running"),
  Type.Literal("awaiting_agents"),
  Type.Literal("complete"),
  Type.Literal("blocked"),
  Type.Literal("failed"),
]);
export type HyperresearchStepStatus = Static<typeof HyperresearchStepStatusSchema>;

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
export type HyperresearchCliOperation = Static<typeof HyperresearchCliOperationSchema>;

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
  { additionalProperties: false },
);
export type HyperresearchCliCall = Static<typeof HyperresearchCliCallSchema>;

export const HyperresearchStepLoadSchema = Type.Object(
  {
    stepId: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    sha256: Type.String({ minLength: 1 }),
    loadedAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type HyperresearchStepLoad = Static<typeof HyperresearchStepLoadSchema>;

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
  { additionalProperties: false },
);
export type HyperresearchStepRecord = Static<typeof HyperresearchStepRecordSchema>;

export const HyperresearchResumeEventSchema = Type.Object(
  {
    at: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
    nextStepId: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type HyperresearchResumeEvent = Static<typeof HyperresearchResumeEventSchema>;

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
  { additionalProperties: false },
);
export type HyperresearchFailure = Static<typeof HyperresearchFailureSchema>;

export const HyperresearchAgentJobStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("complete"),
  Type.Literal("failed"),
]);
export type HyperresearchAgentJobStatus = Static<typeof HyperresearchAgentJobStatusSchema>;

export const HyperresearchAgentArtifactWriteSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    sha256: Type.String({ minLength: 1 }),
    summary: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type HyperresearchAgentArtifactWrite = Static<typeof HyperresearchAgentArtifactWriteSchema>;

export const HyperresearchAgentJobSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
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
  { additionalProperties: false },
);
export type HyperresearchAgentJob = Static<typeof HyperresearchAgentJobSchema>;

export const HyperresearchAgentOutputSchema = Type.Object(
  {
    jobId: Type.String({ minLength: 1 }),
    role: Type.String({ minLength: 1 }),
    status: Type.Union([Type.Literal("complete"), Type.Literal("failed")]),
    summary: Type.String({ minLength: 1 }),
    evidence: Type.Array(Type.String()),
    artifactWrites: Type.Optional(Type.Array(HyperresearchAgentArtifactWriteSchema)),
    sourceUrls: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    failure: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type HyperresearchAgentOutput = Static<typeof HyperresearchAgentOutputSchema>;

export const HyperresearchReviewDispositionSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    severity: Type.Union([Type.Literal("blocking"), Type.Literal("warning")]),
    status: Type.Union([Type.Literal("open"), Type.Literal("accepted"), Type.Literal("deferred"), Type.Literal("closed")]),
    evidence: Type.Array(Type.String({ minLength: 1 })),
    disposition: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type HyperresearchReviewDisposition = Static<typeof HyperresearchReviewDispositionSchema>;

export const HyperresearchReportSnapshotSchema = Type.Object(
  {
    stepId: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    sha256: Type.String({ minLength: 1 }),
    createdAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type HyperresearchReportSnapshot = Static<typeof HyperresearchReportSnapshotSchema>;

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
  { additionalProperties: false },
);
export type HyperresearchSourceCapture = Static<typeof HyperresearchSourceCaptureSchema>;

export const HyperresearchPatchGuardSchema = Type.Object(
  {
    snapshotPath: Type.Optional(Type.String({ minLength: 1 })),
    snapshotSha256: Type.Optional(Type.String({ minLength: 1 })),
    violations: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type HyperresearchPatchGuard = Static<typeof HyperresearchPatchGuardSchema>;

export const HyperresearchRunLedgerSchema = Type.Object(
  {
    version: Type.Union([Type.Literal(1), Type.Literal(2)]),
    runId: Type.String({ minLength: 1 }),
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    tierSource: Type.Optional(Type.Union([Type.Literal("user"), Type.Literal("auto-default"), Type.Literal("decomposition"), Type.Literal("fixture")])),
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
  { additionalProperties: false },
);
export type HyperresearchRunLedger = Static<typeof HyperresearchRunLedgerSchema>;

export const HyperresearchV8RunLedgerSchema = Type.Object(
  {
    version: Type.Literal(2),
    runId: Type.String({ minLength: 1 }),
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    tierSource: Type.Union([Type.Literal("user"), Type.Literal("auto-default"), Type.Literal("decomposition"), Type.Literal("fixture")]),
    vaultTag: Type.String({ minLength: 1 }),
    vaultRoot: Type.String({ minLength: 1 }),
    artifactRoot: Type.String({ minLength: 1 }),
    stepsRoot: Type.String({ minLength: 1 }),
    queryFilePath: Type.Optional(Type.String({ minLength: 1 })),
    routeStepIds: Type.Array(Type.String({ minLength: 1 })),
    wrapperRequirements: Type.Array(Type.String({ minLength: 1 })),
    currentStepId: Type.Optional(Type.String({ minLength: 1 })),
    completed: Type.Boolean(),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
    steps: Type.Array(HyperresearchStepRecordSchema),
    cliCalls: Type.Array(HyperresearchCliCallSchema),
    agentJobs: Type.Array(HyperresearchAgentJobSchema),
    reviewDispositions: Type.Array(HyperresearchReviewDispositionSchema),
    reportSnapshots: Type.Array(HyperresearchReportSnapshotSchema),
    sourceCaptures: Type.Array(HyperresearchSourceCaptureSchema),
    patchGuard: HyperresearchPatchGuardSchema,
    resumes: Type.Array(HyperresearchResumeEventSchema),
    failures: Type.Array(HyperresearchFailureSchema),
  },
  { additionalProperties: false },
);
export type HyperresearchV8RunLedger = Static<typeof HyperresearchV8RunLedgerSchema>;

export type HyperresearchStepDefinition = {
  id: string;
  title: string;
  fileName: string;
  requiredArtifacts: string[];
  tierGate?: "all" | "full";
  agentRoles?: string[];
  requiredCliOperations?: HyperresearchCliOperation[];
  snapshotFinalReport?: boolean;
};

export type LoadedHyperresearchStep = HyperresearchStepLoad & {
  body: string;
};

export const HyperresearchIntegrityFindingSchema = Type.Object(
  {
    severity: Type.Union([Type.Literal("blocking"), Type.Literal("warning")]),
    code: Type.Union([
      Type.Literal("awaiting-agent-output"),
      Type.Literal("failed-agent-job"),
      Type.Literal("missing-step-load"),
      Type.Literal("missing-required-artifact"),
      Type.Literal("failed-cli-call"),
      Type.Literal("failed-step"),
      Type.Literal("incomplete-run"),
      Type.Literal("open-review-finding"),
      Type.Literal("patch-only-violation"),
      Type.Literal("missing-source-capture"),
      Type.Literal("missing-claim-trace"),
    ]),
    message: Type.String({ minLength: 1 }),
    stepId: Type.Optional(Type.String({ minLength: 1 })),
    artifact: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type HyperresearchIntegrityFinding = Static<typeof HyperresearchIntegrityFindingSchema>;

export type HyperresearchCliResult = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

export const V8RunStatusSchema = Type.Union([
  Type.Literal("running"),
  Type.Literal("awaiting_agents"),
  Type.Literal("complete"),
  Type.Literal("blocked"),
]);
export type V8RunStatus = Static<typeof V8RunStatusSchema>;
