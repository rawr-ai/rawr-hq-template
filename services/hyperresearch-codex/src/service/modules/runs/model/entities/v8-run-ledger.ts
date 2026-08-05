import { type Static, Type } from "typebox";
import {
  HyperresearchAgentJobSchema,
  HyperresearchCliCallSchema,
  HyperresearchFailureSchema,
  HyperresearchPatchGuardSchema,
  HyperresearchReportSnapshotSchema,
  HyperresearchResumeEventSchema,
  HyperresearchReviewDispositionSchema,
  HyperresearchSourceCaptureSchema,
  HyperresearchStepRecordSchema,
  HyperresearchTierSchema,
} from "../../../../model/entities";

/** Runs-owned version-two ledger with every V8 lifecycle invariant made required. */
export const HyperresearchV8RunLedgerSchema = Type.Object(
  {
    version: Type.Literal(2),
    runId: Type.String({ minLength: 1 }),
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    tierSource: Type.Union([
      Type.Literal("user"),
      Type.Literal("auto-default"),
      Type.Literal("decomposition"),
      Type.Literal("fixture"),
    ]),
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
  { additionalProperties: false }
);

/** Runs-owned V8 ledger derived from its canonical TypeBox schema. */
export type HyperresearchV8RunLedger = Static<typeof HyperresearchV8RunLedgerSchema>;
