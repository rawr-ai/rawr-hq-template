import { type Static, Type } from "typebox";
import type {
  HyperresearchCliBackend,
  HyperresearchCodexIO,
} from "../../shared/resources";

export const HyperresearchTierSchema = Type.Union([
  Type.Literal("light"),
  Type.Literal("full"),
]);
export type HyperresearchTier = Static<typeof HyperresearchTierSchema>;

export const HyperresearchStepStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("running"),
  Type.Literal("complete"),
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
      Type.Literal("artifact"),
      Type.Literal("step"),
      Type.Literal("policy"),
    ]),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type HyperresearchFailure = Static<typeof HyperresearchFailureSchema>;

export const HyperresearchRunLedgerSchema = Type.Object(
  {
    version: Type.Literal(1),
    runId: Type.String({ minLength: 1 }),
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    vaultRoot: Type.String({ minLength: 1 }),
    artifactRoot: Type.String({ minLength: 1 }),
    currentStepId: Type.Optional(Type.String({ minLength: 1 })),
    completed: Type.Boolean(),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
    steps: Type.Array(HyperresearchStepRecordSchema),
    cliCalls: Type.Array(HyperresearchCliCallSchema),
    resumes: Type.Array(HyperresearchResumeEventSchema),
    failures: Type.Array(HyperresearchFailureSchema),
  },
  { additionalProperties: false },
);
export type HyperresearchRunLedger = Static<typeof HyperresearchRunLedgerSchema>;

export type HyperresearchStepDefinition = {
  id: string;
  title: string;
  fileName: string;
  requiredArtifacts: string[];
};

export type LoadedHyperresearchStep = HyperresearchStepLoad & {
  body: string;
};

export const HyperresearchIntegrityFindingSchema = Type.Object(
  {
    severity: Type.Union([Type.Literal("blocking"), Type.Literal("warning")]),
    code: Type.Union([
      Type.Literal("missing-step-load"),
      Type.Literal("missing-required-artifact"),
      Type.Literal("failed-cli-call"),
      Type.Literal("failed-step"),
      Type.Literal("incomplete-run"),
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

export const RunSyntheticSliceInputSchema = Type.Object(
  {
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    vaultRoot: Type.String({ minLength: 1 }),
    stepsRoot: Type.String({ minLength: 1 }),
    artifactRoot: Type.Optional(Type.String({ minLength: 1 })),
    ledgerPath: Type.Optional(Type.String({ minLength: 1 })),
    maxSteps: Type.Optional(Type.Number({ minimum: 1 })),
    resumeReason: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type RunSyntheticSliceInput = Static<typeof RunSyntheticSliceInputSchema>;

export type HyperresearchRunnerOptions = RunSyntheticSliceInput & {
  io?: HyperresearchCodexIO;
  cli?: HyperresearchCliBackend;
};

export const HyperresearchRunnerResultSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    ledger: HyperresearchRunLedgerSchema,
    integrity: Type.Array(HyperresearchIntegrityFindingSchema),
  },
  { additionalProperties: false },
);
export type HyperresearchRunnerResult = Static<typeof HyperresearchRunnerResultSchema>;
